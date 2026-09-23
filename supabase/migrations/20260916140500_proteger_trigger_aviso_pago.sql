-- El trigger del aviso podía abortar el INSERT que lo dispara.
--
-- La migración 20260915120500 dejó las dos lecturas —`config` y Vault— fuera del
-- bloque protegido: el `exception when others` solo envolvía al `net.http_post`.
-- El caso "falta el valor" sí estaba cubierto (devuelve null y avisa), pero el
-- caso "la lectura falla" no.
--
-- Y falla de dos formas reales: `vault.decrypted_secrets` descifra al leer, así
-- que revienta si el secreto se corrompe; y cualquier `alter table config` de
-- una migración futura toma ACCESS EXCLUSIVE y deja la lectura esperando hasta
-- el `lock_timeout`. Reproducido con `config` bloqueada:
--
--   ERROR:  canceling statement due to lock timeout
--   CONTEXT: PL/pgSQL function avisar_pago_nuevo() line 6 at SQL statement
--   pagos antes: 2 -> pagos después: 2
--
-- Un pago de ₡377.742 no se guardó. Eso contradice la razón de ser de este
-- trigger: quedarse sin aviso es molesto, perder el registro de plata que entró
-- es el peor bug del sistema.
--
-- Ahora el cuerpo entero va adentro del bloque. Cualquier cosa que falle —la
-- lectura, el descifrado, el POST— termina en un `warning` y el INSERT sigue.

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
  begin
    select valor #>> '{}' into destino from config where clave = 'enviar_push_url';
    select decrypted_secret into llave from vault.decrypted_secrets where name = 'service_role_key';

    if destino is null or llave is null then
      raise warning 'Falta config.enviar_push_url o el secreto service_role_key: el pago % entró sin aviso', new.id;
      return null;
    end if;

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
    raise warning 'No se pudo avisar del pago %: %', new.id, sqlerrm;
  end;

  return null;
end;
$funcion$;

revoke execute on function avisar_pago_nuevo() from public;
revoke execute on function avisar_pago_nuevo() from anon, authenticated;
