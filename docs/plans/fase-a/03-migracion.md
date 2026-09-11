« [Fase A](README.md)

# 03 · Migración de Fase A

**Produce:** tablas `pedidos` y `webhook_eventos`, RLS, y la función `upsert_pedido`.

Contexto de diseño: [modelo de datos](../../specs/05-datos.md).

**Files:**
- Create: `supabase/migrations/<timestamp>_fase_a_pedidos.sql`
- Create: `supabase/config.toml` (lo genera `supabase init`)

- [ ] **Step 1: Inicializar Supabase local**

```bash
supabase init
supabase start
```

Expected: imprime la Project URL y las claves **Publishable** y **Secret**. Anotar las tres — hacen falta en las tareas siguientes.

Si falla con `Cannot connect to the Docker daemon`, abrir Docker Desktop y reintentar.

- [ ] **Step 2: Crear el archivo de migración**

```bash
supabase migration new fase_a_pedidos
```

Pegar dentro del archivo generado:

```sql
-- Fase A: pedidos de WooCommerce + auditoría de webhooks.
-- WooCommerce nunca se escribe: estas tablas son un espejo de solo lectura,
-- salvo estado_pago, que es nuestra fuente de verdad.

create extension if not exists pg_trgm;

create table pedidos (
  id               uuid primary key default gen_random_uuid(),
  woo_order_id     bigint unique not null,
  numero_pedido    text not null,
  cliente_nombre   text not null,
  cliente_email    text,
  cliente_telefono text,
  total_centimos   bigint not null check (total_centimos >= 0),
  moneda           text not null default 'CRC',
  estado_woo       text not null,
  estado_pago      text not null default 'pendiente'
                   check (estado_pago in ('pendiente', 'revisar', 'pagado', 'anulado')),
  fecha_pedido     timestamptz not null,
  raw              jsonb not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on column pedidos.estado_woo is
  'Lo que dice WooCommerce. Informativo: el cliente a veces marca processing sin verificar el pago.';
comment on column pedidos.estado_pago is
  'Nuestra fuente de verdad. No se sincroniza de vuelta a WooCommerce.';
comment on column pedidos.total_centimos is
  'CRC en céntimos como entero. El matching compara montos por igualdad exacta y el punto flotante lo rompe.';

create index pedidos_estado_pago_fecha_idx on pedidos (estado_pago, fecha_pedido desc);
create index pedidos_cliente_nombre_trgm_idx on pedidos using gin (cliente_nombre gin_trgm_ops);

create table webhook_eventos (
  id           bigserial primary key,
  fuente       text not null,
  topic        text,
  payload      jsonb not null,
  firma_valida boolean not null,
  procesado_ok boolean,
  error        text,
  recibido_at  timestamptz not null default now()
);

create index webhook_eventos_recibido_idx on webhook_eventos (recibido_at desc);

-- updated_at automático
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger pedidos_set_updated_at
  before update on pedidos
  for each row execute function set_updated_at();

-- Ingest de WooCommerce.
-- estado_pago se siembra SOLO al insertar. Los updates nunca lo pisan:
-- order.updated dispara en cada cambio en la tienda, y sin esta regla
-- una conciliación confirmada volvería a 'pendiente' porque alguien
-- editó una nota del pedido en WooCommerce.
create or replace function upsert_pedido(p jsonb)
returns void
language plpgsql
as $$
begin
  insert into pedidos (
    woo_order_id, numero_pedido, cliente_nombre, cliente_email, cliente_telefono,
    total_centimos, moneda, estado_woo, estado_pago, fecha_pedido, raw
  )
  values (
    (p->>'woo_order_id')::bigint,
    p->>'numero_pedido',
    p->>'cliente_nombre',
    p->>'cliente_email',
    p->>'cliente_telefono',
    (p->>'total_centimos')::bigint,
    p->>'moneda',
    p->>'estado_woo',
    p->>'estado_pago',
    (p->>'fecha_pedido')::timestamptz,
    p->'raw'
  )
  on conflict (woo_order_id) do update set
    numero_pedido    = excluded.numero_pedido,
    cliente_nombre   = excluded.cliente_nombre,
    cliente_email    = excluded.cliente_email,
    cliente_telefono = excluded.cliente_telefono,
    total_centimos   = excluded.total_centimos,
    moneda           = excluded.moneda,
    estado_woo       = excluded.estado_woo,
    fecha_pedido     = excluded.fecha_pedido,
    raw              = excluded.raw,
    -- Única excepción: un pedido que la tienda anula y que todavía
    -- nadie cobró deja de contar como deuda. Un 'pagado' nunca se degrada.
    estado_pago      = case
                         when excluded.estado_woo in ('cancelled', 'refunded', 'failed')
                              and pedidos.estado_pago = 'pendiente'
                         then 'anulado'
                         else pedidos.estado_pago
                       end;
end;
$$;

-- Postgres otorga EXECUTE a PUBLIC en toda función nueva, y anon/authenticated
-- heredan de ahí. Revocar solo de esos dos roles no hace nada: hay que revocar
-- de public primero. Sin esto, la publishable key puede invocar la función
-- (RLS igual detiene el insert, pero la defensa correcta es no dejar entrar).
revoke execute on function upsert_pedido(jsonb) from public;
revoke execute on function upsert_pedido(jsonb) from anon, authenticated;

-- RLS: deny-all por defecto. Sin policy, nadie lee nada.
alter table pedidos enable row level security;
alter table webhook_eventos enable row level security;

create policy "usuario autenticado lee pedidos"
  on pedidos for select
  to authenticated
  using (true);

create policy "usuario autenticado actualiza pedidos"
  on pedidos for update
  to authenticated
  using (true)
  with check (true);

-- webhook_eventos no tiene policy: solo la secret key (que salta RLS) lo toca.
```

- [ ] **Step 3: Aplicar la migración**

Run: `supabase db reset`
Expected: termina con `Finished supabase db reset.` sin errores.

- [ ] **Step 4: Verificar que RLS bloquea el acceso anónimo**

```bash
set -a && . ./.env.local && set +a
curl -s "$SUPABASE_URL/rest/v1/pedidos" -H "apikey: $VITE_SUPABASE_PUBLISHABLE_KEY"
curl -s "$SUPABASE_URL/rest/v1/webhook_eventos" -H "apikey: $VITE_SUPABASE_PUBLISHABLE_KEY"
```

Expected: `[]` en ambas — array vacío, **no** un error. RLS no rechaza: simplemente no devuelve filas. Esa es la garantía que buscamos, que la publishable key sola no ve nada.

- [ ] **Step 5: Verificar que la publishable key no puede invocar `upsert_pedido`**

```bash
curl -s -X POST "$SUPABASE_URL/rest/v1/rpc/upsert_pedido" \
  -H "apikey: $VITE_SUPABASE_PUBLISHABLE_KEY" \
  -H "Content-Type: application/json" -d '{"p":{}}'
```

Expected: `permission denied for function upsert_pedido`.

**Si en cambio dice `new row violates row-level security policy`, el `revoke` está mal**: significa que la función se ejecutó y solo RLS la detuvo. Falta el `revoke ... from public`.

- [ ] **Step 6: Verificar las reglas de transición de `estado_pago`**

Con la secret key, insertar un pedido y recorrer los tres casos. `upsert_pedido` siempre manda `estado_pago: "pendiente"` — el punto es comprobar que la base lo ignora cuando corresponde:

| Estado actual en la base | `estado_woo` que llega de Woo | Esperado |
|---|---|---|
| `pendiente` | `cancelled` | `anulado` |
| `pagado` | `cancelled` | `pagado` — no se degrada |
| `pendiente` | `processing` | `pendiente` |

Y la idempotencia: cinco upserts del mismo `woo_order_id` dejan **una** fila.

- [ ] **Step 7: Commit**

```bash
git add supabase/
git commit -m "feat(db): tablas pedidos y webhook_eventos con RLS"
```

## Migración de seguimiento: `search_path` fijo

El linter de Supabase marcó `function_search_path_mutable` en las dos funciones. Se corrigió en una **migración aparte**, `20260911183259_fijar_search_path.sql`, no editando la anterior:

```sql
alter function set_updated_at() set search_path = public, pg_temp;
alter function upsert_pedido(jsonb) set search_path = public, pg_temp;
```

Una migración ya aplicada no se edita. Si se cambia, las bases que ya la corrieron quedan con un hash distinto al del archivo y `supabase db push` falla o, peor, aplica un esquema que no coincide con el que tiene la nube.

El porqué del `search_path` y el orden de `pg_temp` están en [entorno](../../referencia/entorno.md).

---

« [02 · Utils](02-utils.md) · [04 · Cliente Supabase →](04-cliente-supabase.md)
