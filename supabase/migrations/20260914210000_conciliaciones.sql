-- La tabla donde vive el cruce pago <-> pedido, y los números que lo gobiernan.
--
-- Separada del matcher a propósito: esto es el esquema, la migración siguiente
-- es la lógica. Si el algoritmo hay que corregirlo, se reemplaza la función sin
-- tocar la tabla ni perder lo ya conciliado.

create extension if not exists pg_trgm;

create table conciliaciones (
  id             uuid primary key default gen_random_uuid(),
  pago_id        uuid not null references pagos (id),
  pedido_id      uuid not null references pedidos (id),
  score          numeric not null,
  -- El detalle de por qué dio ese score: {monto, nombre, tiempo, referencia}.
  -- Sin esto, calibrar los umbrales sería adivinar — es la materia prima para
  -- entender por qué el matcher acertó o falló.
  desglose       jsonb not null,
  origen         text not null check (origen in ('auto', 'manual')),
  estado         text not null check (estado in ('sugerido', 'confirmado', 'descartado')),
  confirmado_por text,
  confirmado_at  timestamptz,
  created_at     timestamptz not null default now(),
  unique (pago_id, pedido_id)
);

-- R5: un pago tapa un pedido y uno solo. Impuesto por la base y no por el
-- código: un bug de aplicación no puede saltarse un índice único. Parciales
-- porque un pago sí puede tener varios candidatos *sugeridos* compitiendo; lo
-- que no puede es tener dos confirmados.
create unique index conciliacion_pago_unica
  on conciliaciones (pago_id) where estado = 'confirmado';
create unique index conciliacion_pedido_unica
  on conciliaciones (pedido_id) where estado = 'confirmado';

-- El matcher busca candidatos por pedido pendiente y por pago sin conciliar.
create index conciliaciones_pedido on conciliaciones (pedido_id);
create index conciliaciones_estado on conciliaciones (estado);

-- `similarity(remitente_nombre, cliente_nombre)` sin índice es un scan por cada
-- pago. Con 17 pedidos da igual; con dos años de histórico no.
create index pedidos_cliente_nombre_trgm on pedidos using gin (cliente_nombre gin_trgm_ops);

alter table conciliaciones enable row level security;

-- Un solo usuario, el dueño. Lo que protege es exigir sesión: sin `auth.uid()`
-- la publishable key del bundle no ve nada.
create policy conciliaciones_lee on conciliaciones
  for select to authenticated using (auth.uid() is not null);

-- Confirmar o descartar una sugerencia es trabajo del dueño desde "Revisar".
-- Insertar no: las filas las crea el matcher, que corre como definer.
create policy conciliaciones_resuelve on conciliaciones
  for update to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);

revoke insert, delete, truncate on conciliaciones from anon, authenticated;

-- Los números del algoritmo viven acá y no en el código: van a estar mal el día
-- uno y se calibran cambiando una fila, sin redeploy. Los pesos suman 1.0.
insert into config (clave, valor) values
  ('umbral_auto',       '0.85'),
  ('umbral_revisar',    '0.55'),
  ('ventana_dias',      '7'),
  ('peso_monto',        '0.45'),
  ('peso_nombre',       '0.25'),
  ('peso_tiempo',       '0.10'),
  ('peso_referencia',   '0.20'),
  -- Dos candidatos con scores casi iguales son una moneda al aire. Si la
  -- diferencia entre el primero y el segundo no llega a esto, se sugiere en vez
  -- de auto-confirmar: es exactamente el caso de dos pedidos del mismo monto el
  -- mismo día, donde acertar por azar esconde plata sin cobrar.
  ('margen_desempate',  '0.05')
on conflict (clave) do nothing;
