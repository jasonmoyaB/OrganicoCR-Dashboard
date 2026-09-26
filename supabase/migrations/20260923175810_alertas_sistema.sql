-- Lo que se rompe del lado del servidor —el buzón que no abre, el respaldo LLM
-- sin créditos, el push que no llega— pasa dentro de una Edge Function que
-- nadie mira. Hasta acá la única pista era un 500 en cron.job_run_details.
--
-- Cada componente escribe su problema acá, explicado para el dueño, y borra la
-- fila cuando vuelve a andar. El dashboard muestra lo que haya. Un origen nuevo
-- es un `upsert` más en su función: el frontend no se toca.
--
-- Una fila por origen: un fallo que se repite cada 5 minutos actualiza la misma
-- fila en vez de llenar la tabla, y `desde` —que el upsert no manda— conserva
-- cuándo empezó.
create table alertas_sistema (
  origen          text primary key,
  mensaje         text not null,
  desde           timestamptz not null default now(),
  actualizado_at  timestamptz not null default now()
);

alter table alertas_sistema enable row level security;

-- El navegador solo lee. Escriben las funciones con la secret key.
revoke all on alertas_sistema from anon;
revoke insert, update, delete, truncate on alertas_sistema from authenticated;

create policy "usuario autenticado lee alertas"
  on alertas_sistema for select
  to authenticated
  using ((select auth.uid()) is not null);
