-- Fija el search_path de las funciones propias.
--
-- Sin esto, el nombre `pedidos` dentro de la función se resuelve contra el
-- search_path de quien la invoca. Un rol que pueda crear un esquema propio
-- y anteponerlo puede hacer que la función escriba en SU tabla, no en la
-- nuestra. El linter de Supabase lo reporta como `function_search_path_mutable`.
--
-- `public, pg_temp` y no `''`: las funciones referencian `pedidos` sin calificar,
-- y pg_temp va al final a propósito — si va primero, una tabla temporal del
-- atacante gana sobre la real.

alter function set_updated_at() set search_path = public, pg_temp;
alter function upsert_pedido(jsonb) set search_path = public, pg_temp;
