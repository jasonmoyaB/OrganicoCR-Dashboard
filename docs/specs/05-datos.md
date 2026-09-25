« [Spec](README.md)

# 5. Modelo de datos y conciliación

## Esquema

### Fase A

```sql
create table pedidos (
  id               uuid primary key default gen_random_uuid(),
  woo_order_id     bigint unique not null,            -- clave de idempotencia
  numero_pedido    text not null,                     -- el # que ve el comprador
  cliente_nombre   text not null,
  cliente_email    text,
  cliente_telefono text,
  total_centimos   bigint not null,                   -- CRC en céntimos, nunca float
  moneda           text not null default 'CRC',
  estado_woo       text not null,                     -- informativo (P2)
  estado_pago      text not null default 'pendiente', -- pendiente|revisar|pagado|anulado
  fecha_pedido     timestamptz not null,
  raw              jsonb not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

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
```

**`estado_pago` — los cuatro valores:**

| Valor | Significado |
|---|---|
| `pendiente` | Debe. Aparece en la sección "Deben" |
| `revisar` | Hay un pago candidato sin certeza suficiente (Fase C) |
| `pagado` | Conciliado, o marcado a mano por el dueño |
| `anulado` | La tienda lo canceló, reembolsó o falló. No cuenta como deuda ni como cobro |

**El estado inicial se deriva de WooCommerce una sola vez:**

| `estado_woo` | `estado_pago` inicial |
|---|---|
| `completed` | `pagado` |
| `cancelled`, `refunded`, `failed` | `anulado` |
| cualquier otro, incluido desconocido | `pendiente` |

El default ante un estado desconocido es deliberado: un pedido que aparece en "Deben" lo ve alguien. Uno que se asume pagado se esconde, y un cobro perdido no se descubre nunca.

### Fase B

```sql
create table correos_banco (
  id               bigserial primary key,
  mensaje_id       text unique not null,   -- header Message-ID: clave de idempotencia
  remitente        text not null,
  asunto           text,
  cuerpo           text not null,          -- crudo, para re-parsear
  recibido_at      timestamptz not null,
  uid_imap         bigint,                 -- solo para el cursor del poll
  procesado_ok     boolean,                -- null = capturado, sin intentar extraer
  error            text,
  motivo_sin_pago  text,                   -- por qué se descartó, si se descartó
  capturado_at     timestamptz not null default now()
);

create table pagos (
  id                    uuid primary key default gen_random_uuid(),
  correo_id             bigint not null references correos_banco (id),
  mensaje_id            text unique not null,         -- clave de idempotencia
  remitente_nombre      text,
  monto_centimos        bigint not null,
  moneda                text not null default 'CRC',
  referencia_detalle    text,                         -- lo que escribió en el motivo
  fecha_pago            timestamptz not null,
  metodo_extraccion     text not null,                -- 'regex' | 'llm'
  confianza_extraccion  numeric,
  cuerpo_correo         text not null,                -- auditoría y re-parseo
  created_at            timestamptz not null default now()
);

revoke update on pagos from authenticated, anon;  -- P4
```

**`procesado_ok = false` significa una sola cosa: nadie supo leer ese correo.** Hasta el 2026-09-14 también caían ahí los correos correctamente descartados —egresos, avisos en dólares—, y el dashboard avisaba "47 correos sin procesar" cuando los 47 estaban bien. Un aviso siempre encendido deja de avisar. Ahora `extraerPago` devuelve tres clases (`pago` | `no-aplica` | `desconocido`) y el motivo del descarte queda en `motivo_sin_pago`.

### Fase C

```sql
create table conciliaciones (
  id             uuid primary key default gen_random_uuid(),
  pago_id        uuid not null references pagos(id),
  pedido_id      uuid not null references pedidos(id),
  score          numeric not null,
  desglose       jsonb not null,   -- {monto:1, nombre:0.82, tiempo:0.9, referencia:0}
  origen         text not null,    -- 'auto' | 'manual'
  estado         text not null,    -- 'sugerido' | 'confirmado' | 'descartado'
  confirmado_por text,
  confirmado_at  timestamptz,
  created_at     timestamptz not null default now(),
  unique (pago_id, pedido_id)
);

-- R5: 1:1 impuesto por la base, no por el código de aplicación
create unique index conciliacion_pago_unica
  on conciliaciones (pago_id)   where estado = 'confirmado';
create unique index conciliacion_pedido_unica
  on conciliaciones (pedido_id) where estado = 'confirmado';

create table config (clave text primary key, valor jsonb not null);
-- umbral_auto = 0.85, umbral_revisar = 0.55, ventana_dias = 7
```

### Fase E

```sql
create table suscripciones_push (
  id              uuid primary key default gen_random_uuid(),
  usuario_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint        text not null unique,   -- la URL del servicio de push: identifica al dispositivo
  p256dh          text not null,          -- llave pública del navegador: con ella se cifra el payload
  auth            text not null,
  agente          text,
  created_at      timestamptz not null default now(),
  ultimo_envio_at timestamptz
);
```

**Una fila por navegador, no por usuario.** El dueño mira el dashboard desde el teléfono y desde la compu, y cada uno tiene su propio endpoint. Con una fila por usuario, activar en el segundo dispositivo apagaría el primero.

**Las cuatro policies hacen falta, no dos.** El frontend hace `upsert`, y un upsert es `INSERT ... ON CONFLICT DO UPDATE`: con la policy de insert sola, activar por segunda vez desde el mismo teléfono falla. Verificado por REST el 2026-09-15: con sesión 201 y después 200; con la publishable key sola, `401` y `new row violates row-level security policy`.

### Errores del servidor

```sql
create table alertas_sistema (
  origen          text primary key,          -- 'correo' | 'llm' | 'push' | lo que se sume
  mensaje         text not null,             -- ya explicado para el dueño
  desde           timestamptz not null default now(),
  actualizado_at  timestamptz not null default now()
);
```

**Una fila por origen.** Un fallo que se repite cada 5 minutos actualiza la misma fila y `desde` conserva cuándo empezó. El navegador solo lee; escriben las Edge Functions con la secret key y borran la fila cuando el problema se resuelve.

## Dos decisiones de esquema que importan

**`unique index ... where estado = 'confirmado'`** — Postgres impide físicamente que un pago tape dos pedidos, o que dos pagos concilien el mismo pedido. La regla de negocio vive en la base, donde ningún bug de aplicación puede saltársela.

**`bigint` en céntimos** — el matching depende de comparar montos por igualdad exacta. Con punto flotante, `1500.00` puede no ser igual a `1500.00`, y el auto-match fallaría de forma intermitente e imposible de reproducir.

## `upsert_pedido` — el ingest

`estado_pago` se escribe **solo al insertar**. Los updates nunca lo pisan.

**Por qué:** `order.updated` dispara en cada cambio en la tienda. Sin esta regla, editar una nota de un pedido en WooCommerce revertiría a `pendiente` un pedido ya conciliado — borrando el trabajo de la Fase C en silencio.

Única excepción, en la dirección segura:

```sql
estado_pago = case
  when excluded.estado_woo in ('cancelled', 'refunded', 'failed')
       and pedidos.estado_pago = 'pendiente'
  then 'anulado'
  else pedidos.estado_pago
end
```

Un pedido que la tienda anula y que nadie cobró deja de contar como deuda. Un `pagado` nunca se degrada.

Implementación completa en [`plans/fase-a/03-migracion.md`](../plans/fase-a/03-migracion.md).

## Algoritmo de conciliación

```
score = 0.45 · monto_exacto                              -- 1 si coincide al céntimo, si no 0
      + 0.25 · similarity(remitente, cliente_nombre)     -- pg_trgm, 0..1
      + 0.10 · decaimiento_tiempo                        -- 1 mismo día, decae por ventana
      + 0.20 · referencia_encontrada                     -- número de pedido en el detalle
```

**Regla dura: sin monto exacto, el candidato no puede superar `sugerido`. Nunca auto-confirma.**

**Por qué:** un falso positivo marca como pagado un pedido que no lo está, y el dueño deja de cobrar plata real. Un falso negativo solo genera una fila en "Revisar" que se resuelve con un clic. Los errores no son simétricos, y el diseño se inclina hacia el barato.

**Dos frenos más, por el mismo motivo:**

- Si el segundo candidato queda a menos de `margen_desempate` del primero, se sugiere en vez de confirmar. Dos pedidos del mismo monto el mismo día son una moneda al aire.
- El patrón de la referencia usa bordes de palabra (`\m`/`\M`). Sin ellos, el "69" de un pedido daría positivo dentro de "1069".

### Techo real: 0.80 para pagos de empresa

Las plantillas de transferencia SINPE y de pago inmediato **no traen motivo escrito por quien paga**, solo el número de referencia del banco. El término de 0.20 nunca se activa, así que esos pagos no pasan de `0.45 + 0.25 + 0.10 = 0.80` y jamás alcanzan el umbral de 0.85: caen siempre en "Revisar".

Solo los pagos por SINPE Móvil pueden auto-confirmarse, porque ahí sí viaja el motivo. Que las empresas también se concilien solas exige subir `peso_monto` — es una decisión de riesgo del dueño, no del código.

El término de referencia ([R6](02-restricciones.md)) hace que los casos donde el comprador sí escribió el número de factura salten directo a auto-confirmación. El resto cae al scoring.

### Umbrales

| Rango | Acción |
|---|---|
| `>= 0.85` | Auto-confirmar → el pedido pasa a `pagado` |
| `0.55 – 0.85` | Sugerir → aparece en "Revisar" |
| `< 0.55` | Descartar |

Viven en la tabla `config`, no como constantes en el código. **Estos números van a estar mal el día uno.** Se calibran con datos reales de las primeras semanas: cambiar una fila, no redeployar.

---

« [Arquitectura](04-arquitectura.md) · [Seguridad →](06-seguridad.md)
