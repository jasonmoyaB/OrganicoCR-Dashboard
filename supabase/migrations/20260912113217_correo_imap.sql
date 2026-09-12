-- El buzón del banco no está en Gmail: es un Dovecot de cPanel al que se llega
-- por IMAP. Verificado en docs/referencia/entorno.md. Los nombres que decían
-- "gmail" quedaron mintiendo, y el identificador de un correo pasa a ser el
-- header Message-ID, que existe en cualquier servidor.
--
-- La 20260912110116 ya está aplicada en la nube, así que no se toca: el estado
-- final se corrige acá, igual que la 20260911205500 con la 182122.

alter table correos_banco rename column gmail_message_id to mensaje_id;
alter table pagos rename column gmail_message_id to mensaje_id;

alter index correos_banco_gmail_message_id_key rename to correos_banco_mensaje_id_key;
alter index pagos_gmail_message_id_key rename to pagos_mensaje_id_key;

comment on column correos_banco.mensaje_id is
  'Header Message-ID del correo. Clave de idempotencia: el UID de IMAP no sirve porque se reinicia si el buzón se recrea.';

-- El UID solo evita re-descargar lo ya visto. La idempotencia la garantiza el
-- unique de arriba, así que perder el cursor cuesta ancho de banda, no datos.
alter table correos_banco add column uid_imap bigint;

delete from config where clave like 'gmail_%';

insert into config (clave, valor) values
  ('correo_poll_url', '"http://kong:8000/functions/v1/correo-poll"'),
  -- Dos bancos, no uno: los pagos entran por Davibank y por BAC, y cada uno
  -- manda su propia plantilla. Por eso es lista y no un solo remitente.
  ('remitentes_banco', '["servicioalcliente@davibank.cr"]'),
  -- uidvalidity null fuerza un barrido completo la primera vez. Si el servidor
  -- devuelve un uidvalidity distinto al guardado, el cursor se descarta.
  ('correo_cursor', '{"uidvalidity": null, "ultimo_uid": 0}');
