-- Cierra el aviso `rls_enabled_no_policy` sin abrir nada.
--
-- `config`, `correos_banco` y `webhook_eventos` tienen RLS activo y cero
-- policies a propósito: guardan los umbrales del matcher, los correos enteros
-- del banco (nombres y montos de terceros, Ley 8968) y los payloads crudos de
-- WooCommerce. El navegador no tiene por qué leer nada de eso. Los únicos que
-- las tocan son la secret key y las funciones `security definer`, y los dos
-- saltan RLS.
--
-- Por eso la policy que va acá no da acceso: lo niega de forma explícita.
-- `as restrictive` pesa más que el no tener policies: se combina con AND contra
-- todas las permisivas, así que una policy que alguien agregue más adelante por
-- error sigue sin abrir la tabla. Para abrirla hay que borrar esta, y eso tiene
-- que hacerse a propósito.

create policy config_sin_acceso_navegador on config
  as restrictive for all to anon, authenticated
  using (false) with check (false);

create policy correos_banco_sin_acceso_navegador on correos_banco
  as restrictive for all to anon, authenticated
  using (false) with check (false);

create policy webhook_eventos_sin_acceso_navegador on webhook_eventos
  as restrictive for all to anon, authenticated
  using (false) with check (false);
