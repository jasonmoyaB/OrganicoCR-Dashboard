-- Cierra los avisos `extension_in_public` y `anon_security_definer_function_executable`
-- del linter de Supabase. Cierra también D6 (docs/specs/09-pendientes.md).
--
-- Con `pg_trgm` en `public`, cualquier rol con CREATE en `public` podía definir
-- su propia `similarity()` y ganarle a la de la extensión dentro del matcher.
-- D6 lo había postergado por miedo a que `pedidos_cliente_nombre_trgm_idx`
-- dejara de usarse. No pasa: el índice apunta a la operator class por OID, no
-- por nombre, y el matcher llama a `similarity()`, que igual nunca usaba ese
-- índice.

alter extension pg_trgm set schema extensions;

-- Esto es lo que no se puede olvidar. `candidatos_de_pago` corre dentro del
-- trigger `pagos_concilian`, y con `search_path = public, pg_temp` no
-- encontraría `similarity()`. La excepción abortaría el INSERT en `pagos` y no
-- se guardaría ningún pago más. `extensions` va primero para que una
-- `public.similarity()` ajena no le gane a la real, y `pg_temp` sigue al final.
alter function candidatos_de_pago(uuid) set search_path = extensions, public, pg_temp;

-- `pg_net` no es relocatable (`alter extension ... set schema` falla), así que
-- se recrea. Sus funciones siguen viviendo en el esquema `net`, así que
-- `net.http_post` no cambia de nombre para `avisar_pago_nuevo` ni para
-- `disparar_correo_poll`, que la resuelven al ejecutarse. Se pierde el
-- historial de respuestas de `net._http_response`, que nadie lee. El event
-- trigger `issue_pg_net_access` de Supabase vuelve a otorgar los mismos grants
-- sobre `net`. Sin `cascade`: si algo dependiera de la extensión, la migración
-- tiene que fallar, no borrarlo.
drop extension pg_net;
create extension pg_net schema extensions;

-- `rls_auto_enable()` es el event trigger que Supabase instala en la nube para
-- activar RLS en cada tabla nueva. En el stack local no existe, de ahí el `if`.
-- Un event trigger se dispara sin mirar EXECUTE: revocar no lo apaga, solo le
-- saca a anon y authenticated un permiso que no les sirve para nada.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public;
    revoke execute on function public.rls_auto_enable() from anon, authenticated;
  end if;
end $$;
