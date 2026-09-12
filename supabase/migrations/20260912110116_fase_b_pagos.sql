-- Fase B: captura de correos del banco y pagos extraídos de ellos.
--
-- La captura y la extracción son dos pasos separados a propósito. Mientras no
-- se conozca la plantilla real del banco (D1, D5) el extractor no existe, pero
-- los correos ya se pueden guardar crudos. Mismo criterio que webhook_eventos:
-- guardar antes de procesar permite re-procesar el histórico cuando el parser
-- mejore, en vez de perder los correos que llegaron mientras tenía un bug.

-- Bitácora cruda. Una fila por correo del banco, procesado o no.
create table correos_banco (
  id               bigserial primary key,
  gmail_message_id text unique not null,
  remitente        text not null,
  asunto           text,
  cuerpo           text not null,
  recibido_at      timestamptz not null,
  procesado_ok     boolean,
  error            text,
  capturado_at     timestamptz not null default now()
);

comment on table correos_banco is
  'Correos del banco tal como llegaron. Fuente para re-parsear si el extractor cambia.';
comment on column correos_banco.procesado_ok is
  'null = capturado, sin intentar extraer. Es el estado normal hasta que exista el extractor.';

-- Índice parcial: las dos consultas que importan (contar pendientes y
-- re-procesar) filtran por procesado_ok is null, que será una minoría con el
-- tiempo. El índice completo desperdiciaría espacio en filas ya procesadas.
create index correos_banco_sin_procesar_idx
  on correos_banco (recibido_at) where procesado_ok is null;

create table pagos (
  id                   uuid primary key default gen_random_uuid(),
  correo_id            bigint not null references correos_banco (id),
  gmail_message_id     text unique not null,
  remitente_nombre     text,
  monto_centimos       bigint not null check (monto_centimos > 0),
  moneda               text not null default 'CRC',
  referencia_detalle   text,
  fecha_pago           timestamptz not null,
  metodo_extraccion    text not null check (metodo_extraccion in ('regex', 'llm')),
  confianza_extraccion numeric check (confianza_extraccion between 0 and 1),
  cuerpo_correo        text not null,
  created_at           timestamptz not null default now()
);

comment on column pagos.monto_centimos is
  'CRC en céntimos como entero. El matching compara por igualdad exacta y el float lo rompe.';
comment on column pagos.cuerpo_correo is
  'Copia del correo al momento de extraer. Permite auditar qué vio el parser sin depender de correos_banco.';
comment on column pagos.metodo_extraccion is
  'regex | llm. Un salto en la proporción de llm significa que el banco cambió la plantilla.';

create index pagos_fecha_idx on pagos (fecha_pago desc);

-- Los pagos son inmutables. Si el parser mejora, se re-parsea el correo y se
-- inserta una fila nueva; la vieja queda como registro de lo que se creyó.
--
-- El revoke de abajo cubre a anon y authenticated, pero no a la secret key, que
-- salta privilegios y RLS. El trigger cierra ese hueco: sin él la invariante
-- valdría para el navegador y no para el backend, que es justo donde un bug
-- de re-proceso sobrescribiría el historial.
--
-- Si algún día una migración necesita corregir filas a mano:
--   alter table pagos disable trigger pagos_inmutables;
create function rechazar_update_pagos()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  raise exception 'Los pagos son inmutables: re-parseá el correo e insertá una fila nueva';
end;
$$;

create trigger pagos_inmutables
  before update on pagos
  for each row execute function rechazar_update_pagos();

-- Umbrales y cursores que se cambian sin redeploy. Se adelanta de la fase C
-- porque el cron del poll necesita la URL y el remitente desde acá.
create table config (
  clave text primary key,
  valor jsonb not null
);

insert into config (clave, valor) values
  -- pg_net corre dentro del container de Postgres: 127.0.0.1 apuntaría al
  -- propio Postgres, no al gateway. En producción esto es la URL del proyecto.
  ('gmail_poll_url', '"http://kong:8000/functions/v1/gmail-poll"'),
  -- Vacío a propósito. El poll aborta si no hay remitente en vez de listar el
  -- buzón entero: sin filtro traería correo personal que no nos corresponde leer.
  ('gmail_remitente_banco', '""'),
  ('gmail_ultimo_poll_at', 'null');

-- Solo el conteo sale al frontend. Los cuerpos de los correos llevan nombres y
-- montos de terceros (Ley 8968) y el dashboard no los necesita para nada.
create function contar_correos_sin_procesar()
returns bigint
language sql
security definer
set search_path = public, pg_temp
as $$
  select count(*) from correos_banco
  where procesado_ok is null and auth.uid() is not null;
$$;

revoke execute on function contar_correos_sin_procesar() from public;
revoke execute on function contar_correos_sin_procesar() from anon;
grant execute on function contar_correos_sin_procesar() to authenticated;

alter table correos_banco enable row level security;
alter table pagos enable row level security;
alter table config enable row level security;

-- correos_banco y config sin policy: deny-all. Solo la secret key los toca.

-- pagos: el dashboard los lee y nada más. Insertar es trabajo del poll, que
-- corre con la secret key.
-- Supabase otorga `all` sobre las tablas nuevas de public a anon y
-- authenticated; RLS filtra select/insert/update/delete, pero NO filtra
-- truncate, que es privilegio puro de tabla. Hoy no hay vector para
-- alcanzarlo desde PostgREST, y aun así no hay razón para dejarlo puesto.
revoke insert, update, delete, truncate, references, trigger
  on pagos from anon, authenticated;

create policy "usuario autenticado lee pagos"
  on pagos for select
  to authenticated
  using (auth.uid() is not null);
