-- `escapar_regex` no escapaba: dejaba el patrón igual de roto, de otra forma.
--
-- La 20260916140000 la escribió con backreference:
--
--   regexp_replace(patron, '([...])', '\\1', 'g')
--
-- Ese reemplazo necesitaba tres barras invertidas seguidas para producir "barra
-- + lo capturado", y una se perdió entre el editor y el archivo. Con dos, el
-- resultado es la barra seguida del dígito 1 literal: `FACT-[2026` salía
-- `FACT-\12026`, y ese patrón tiene una backreference a un grupo que no existe.
--
-- El error no se vio porque los 17 pedidos de la tienda son numéricos puros y
-- ninguno entra al `case`. La vulnerabilidad seguía abierta.
--
-- Acá no hay ninguna barra invertida escrita: la produce `chr(92)`. Es feo y es
-- a propósito — un escape cuya corrección depende de contar barras en el fuente
-- ya falló una vez, y la próxima persona que copie este archivo entre un editor,
-- un heredoc y psql no tiene por qué volver a pagarlo.
--
-- Escapa todo lo que no sea letra, dígito o guion bajo, que es la regla de
-- `preg_quote` y equivalentes. Escapar de más es inofensivo en POSIX ERE:
-- barra + carácter no alfanumérico es siempre ese carácter literal. Lo que NO
-- se puede hacer es escapar letras, porque ahí sí hay secuencias con
-- significado propio (`\m`, `\M`, `\d`).
create or replace function escapar_regex(patron text)
returns text
language sql
immutable
strict
set search_path = public, pg_temp
as $$
  select coalesce(
    string_agg(
      case when caracter ~ '[A-Za-z0-9_]' then caracter else chr(92) || caracter end,
      ''
      order by orden
    ),
    ''
  )
  from regexp_split_to_table(patron, '') with ordinality as partes(caracter, orden);
$$;

revoke execute on function escapar_regex(text) from public;
revoke execute on function escapar_regex(text) from anon, authenticated;
