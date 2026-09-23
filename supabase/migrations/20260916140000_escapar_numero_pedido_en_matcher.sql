-- El número de pedido entraba crudo en un patrón de regex.
--
-- `candidatos_de_pago` armaba el término de referencia concatenando
-- `'\m' || ped.numero_pedido || '\M'`. `numero_pedido` es `orden.number` de
-- WooCommerce: un string libre que cualquier plugin de numeración o facturación
-- redefine. No hace falta un atacante, basta un plugin.
--
-- Con un `[` sin cerrar el patrón deja de compilar, y como esto cuelga de
-- `pagos_concilian` —trigger de INSERT en `pagos`— la excepción aborta la
-- sentencia: a partir de ese pedido NINGÚN pago vuelve a guardarse. Y como
-- `correo-poll` marca el correo como visto por `mensaje_id`, los avisos que
-- lleguen mientras dure no dejan rastro.
--
--   ERROR: invalid regular expression: invalid escape \ sequence
--   CONTEXT: SQL function "candidatos_de_pago" ... trigger pagos_concilian
--
-- La variante silenciosa es peor de auditar: con paréntesis balanceados el
-- patrón es válido pero significa otra cosa. `ORD-(2026)` compila como grupo de
-- captura y hace match contra `ORD-2026`; un `1.2` da positivo dentro de `112` e
-- imputa la plata al pedido equivocado.

-- Escapa los metacaracteres de una expresión regular POSIX para que el texto se
-- compare como literal. `-` queda fuera a propósito: solo es especial dentro de
-- una clase de caracteres, y escaparlo acá produciría un escape inválido.
create or replace function escapar_regex(patron text)
returns text
language sql
immutable
strict
set search_path = public, pg_temp
as $$
  select regexp_replace(patron, '([\^$.|?*+()\[\]{}])', '\\1', 'g');
$$;

revoke execute on function escapar_regex(text) from public;
revoke execute on function escapar_regex(text) from anon, authenticated;

-- Idéntica a la de 20260914210500 salvo el término de referencia, que ahora
-- escapa el número antes de meterlo en el patrón. Los bordes de palabra siguen
-- siendo `\m`/`\M` y por eso se concatenan fuera del escape: son sintaxis del
-- patrón, no texto a buscar.
create or replace function candidatos_de_pago(p_pago_id uuid)
returns table (pedido_id uuid, score numeric, desglose jsonb)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with pago as (select * from pagos where id = p_pago_id),
  pesos as (
    select
      leer_config_numero('peso_monto')      as monto,
      leer_config_numero('peso_nombre')     as nombre,
      leer_config_numero('peso_tiempo')     as tiempo,
      leer_config_numero('peso_referencia') as referencia,
      leer_config_numero('ventana_dias')    as ventana
  ),
  terminos as (
    select
      ped.id,
      (pg.monto_centimos = ped.total_centimos)::int::numeric as t_monto,
      coalesce(similarity(pg.remitente_nombre, ped.cliente_nombre), 0)::numeric as t_nombre,
      -- 1 el mismo día y baja en línea recta hasta el borde de la ventana.
      greatest(
        0,
        1 - extract(epoch from (pg.fecha_pago - ped.fecha_pedido)) / (w.ventana * 86400)
      )::numeric as t_tiempo,
      -- `\m` y `\M` son bordes de palabra: sin ellos el "69" de otro pedido
      -- daría positivo dentro de "1069" e inventaría una coincidencia.
      (coalesce(pg.referencia_detalle, '') ~ ('\m' || escapar_regex(ped.numero_pedido) || '\M'))::int::numeric
        as t_referencia
    from pago pg
    cross join pesos w
    join pedidos ped
      on ped.estado_pago in ('pendiente', 'revisar')
      -- Nunca se cruza plata de una moneda con un pedido de otra: Davibank
      -- avisa ingresos en dólares con la misma redacción que los de colones.
      and ped.moneda = pg.moneda
      -- Un pago puede registrarse poco antes que el pedido; más atrás que eso
      -- ya no es el mismo hecho.
      and pg.fecha_pago >= ped.fecha_pedido - interval '1 day'
      and pg.fecha_pago <= ped.fecha_pedido + (w.ventana * interval '1 day')
    -- Un pedido ya conciliado no vuelve a competir.
    where not exists (
      select 1 from conciliaciones c
      where c.pedido_id = ped.id and c.estado = 'confirmado'
    )
  )
  select
    t.id,
    round(
      (select monto from pesos) * t.t_monto
      + (select nombre from pesos) * t.t_nombre
      + (select tiempo from pesos) * t.t_tiempo
      + (select referencia from pesos) * t.t_referencia,
      4
    ),
    jsonb_build_object(
      'monto', t.t_monto,
      'nombre', round(t.t_nombre, 4),
      'tiempo', round(t.t_tiempo, 4),
      'referencia', t.t_referencia
    )
  from terminos t
  order by 2 desc;
$$;

revoke execute on function candidatos_de_pago(uuid) from public;
revoke execute on function candidatos_de_pago(uuid) from anon, authenticated;
