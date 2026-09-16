-- Un pago nuevo despierta el teléfono del dueño.
--
-- Misma tubería que el cron de correo —config para la URL, Vault para la
-- credencial, `net.http_post` para salir—, pero con una diferencia que no es
-- de estilo: este trigger cuelga de un INSERT en `pagos`. Si levanta una
-- excepción, el pago no se guarda. Quedarse sin aviso es molesto; perder el
-- registro de plata que entró es el peor bug que puede tener este sistema. Por
-- eso acá todo es `raise warning` y nada es `raise exception`.

create extension if not exists pg_net;

create or replace function avisar_pago_nuevo()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $funcion$
declare
  destino text;
  llave   text;
begin
  select valor #>> '{}' into destino from config where clave = 'enviar_push_url';
  select decrypted_secret into llave from vault.decrypted_secrets where name = 'service_role_key';

  if destino is null or llave is null then
    raise warning 'Falta config.enviar_push_url o el secreto service_role_key: el pago % entró sin aviso', new.id;
    return null;
  end if;

  begin
    perform net.http_post(
      url := destino,
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || llave,
        'Content-Type', 'application/json'
      ),
      -- Va el id y no el pago entero: el correo del banco trae nombres y montos
      -- de terceros, y la función los lee de la base con su propia credencial.
      body := jsonb_build_object('pago_id', new.id),
      timeout_milliseconds := 20000
    );
  exception when others then
    raise warning 'No se pudo encolar el aviso del pago %: %', new.id, sqlerrm;
  end;

  return null;
end;
$funcion$;

revoke execute on function avisar_pago_nuevo() from public;
revoke execute on function avisar_pago_nuevo() from anon, authenticated;

-- `pagos_avisan` corre antes que `pagos_concilian` —los triggers de un mismo
-- evento van por orden alfabético— y eso está bien: el aviso dice que entró
-- plata, no qué pedido cubrió. Esperar al matcher solo retrasaría la buena
-- noticia, y un pago que no calza con nada es justamente el que más urge mirar.
create trigger pagos_avisan
after insert on pagos
for each row execute function avisar_pago_nuevo();

-- Igual que `correo_poll_url`: en local el destino es la red de Docker, en la
-- nube el dominio del proyecto. Por eso vive en `config` y no escrito acá.
insert into config (clave, valor) values
  ('enviar_push_url', '"http://kong:8000/functions/v1/enviar-push"')
on conflict (clave) do nothing;
