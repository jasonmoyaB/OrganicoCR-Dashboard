-- Job que despierta a `correo-poll` cada 5 minutos.
--
-- Este archivo NO crea el secreto. La service role key se guarda una vez por
-- entorno, a mano, y nunca en una migración versionada:
--
--   select vault.create_secret('<la service role key>', 'service_role_key');
--
-- Sin ese paso el job existe y falla con un mensaje claro, que es justo lo que
-- se quiere: un cron que corre sin credencial y devuelve 401 en silencio es
-- peor que uno que no corre.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net;

-- La URL sale de `config` y no va escrita acá: `pg_net` corre dentro del
-- contenedor de Postgres, así que en local el destino es la red de Docker
-- (`http://kong:8000/...`) y en la nube el dominio del proyecto. Hardcodearla
-- haría que la migración funcione en un entorno y falle en el otro.
create or replace function disparar_correo_poll()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $funcion$
declare
  destino text;
  llave   text;
begin
  select valor #>> '{}' into destino from config where clave = 'correo_poll_url';
  if destino is null then
    raise exception 'Falta config.correo_poll_url: el cron no sabe a dónde pegarle';
  end if;

  select decrypted_secret into llave from vault.decrypted_secrets where name = 'service_role_key';
  if llave is null then
    raise exception 'Falta el secreto service_role_key en Vault: correr vault.create_secret';
  end if;

  perform net.http_post(
    url := destino,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || llave,
      'Content-Type', 'application/json'
    ),
    -- Menos que los 5 minutos del intervalo: una corrida colgada no se puede
    -- superponer con la siguiente.
    timeout_milliseconds := 240000
  );
end;
$funcion$;

-- Postgres otorga EXECUTE a PUBLIC en toda función nueva, y anon/authenticated
-- heredan de ahí. Revocar solo de esos dos roles no hace nada.
revoke execute on function disparar_correo_poll() from public;
revoke execute on function disparar_correo_poll() from anon, authenticated;

select cron.schedule('correo-poll-5min', '*/5 * * * *', 'select disparar_correo_poll()');
