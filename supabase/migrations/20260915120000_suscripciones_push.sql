-- Dónde mandar el aviso cuando entra un pago.
--
-- Una fila por navegador, no por usuario: el dueño mira el dashboard desde el
-- teléfono y desde la compu, y el servicio de push le da a cada uno su propio
-- endpoint. Si guardáramos uno solo por usuario, activar en el segundo
-- dispositivo apagaría el primero.

create table suscripciones_push (
  id              uuid primary key default gen_random_uuid(),
  usuario_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- La URL que el navegador nos dio para hablar con SU servicio de push
  -- (Google, Mozilla, Apple). Es la identidad del dispositivo: única, y por eso
  -- la clave del upsert.
  endpoint        text not null unique,
  p256dh          text not null,
  auth            text not null,
  agente          text,
  created_at      timestamptz not null default now(),
  ultimo_envio_at timestamptz
);

comment on table suscripciones_push is
  'Un navegador que aceptó notificaciones. La borra `enviar-push` cuando el servicio contesta 404/410.';
comment on column suscripciones_push.p256dh is
  'Llave pública del navegador. Con ella se cifra el payload: el servicio de push transporta el aviso sin poder leerlo.';

alter table suscripciones_push enable row level security;

-- `usuario_id = auth.uid()` y no `true`: acá sí hay algo que aislar. Sin sesión,
-- auth.uid() es null, la comparación da null y la policy no deja pasar nada —o
-- sea que cubre de sobra el "auth.uid() is not null" que pide el proyecto.
--
-- Las cuatro hacen falta. El frontend hace upsert, y un upsert es INSERT ...
-- ON CONFLICT DO UPDATE: con la policy de insert sola, activar por segunda vez
-- desde el mismo teléfono falla.
create policy "el dueño ve sus suscripciones"
  on suscripciones_push for select
  to authenticated
  using (usuario_id = auth.uid());

create policy "el dueño registra su navegador"
  on suscripciones_push for insert
  to authenticated
  with check (usuario_id = auth.uid());

create policy "el dueño actualiza su navegador"
  on suscripciones_push for update
  to authenticated
  using (usuario_id = auth.uid())
  with check (usuario_id = auth.uid());

create policy "el dueño da de baja su navegador"
  on suscripciones_push for delete
  to authenticated
  using (usuario_id = auth.uid());
