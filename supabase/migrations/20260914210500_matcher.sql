-- El matcher: qué pago corresponde a qué pedido.
--
-- Es SQL determinista y no un LLM (P6). El LLM lee el correo; decidir a qué
-- pedido se aplica la plata es una decisión reproducible y auditable, o no
-- sirve. Dos funciones: una puntúa, la otra decide. Se pueden probar por
-- separado y la de puntuar no escribe nada.

-- Cada funcion lleva DOS revokes y no uno. Postgres otorga EXECUTE a PUBLIC en
-- toda funcion nueva, pero Supabase ademas otorga EXECUTE explicito a `anon` y
-- `authenticated` por default privileges del esquema public, y revocar de
-- PUBLIC no toca esos grants nominales. Con uno solo de los dos, estas
-- funciones —todas SECURITY DEFINER— quedan invocables por RPC con la
-- publishable key que viaja en el bundle del navegador. Verificado: sin el
-- segundo revoke, `POST /rest/v1/rpc/conciliar_pago` como anon devuelve 204.

create or replace function leer_config_numero(p_clave text)
returns numeric
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select (valor #>> '{}')::numeric from config where clave = p_clave;
$$;

revoke execute on function leer_config_numero(text) from public;
revoke execute on function leer_config_numero(text) from anon, authenticated;

-- Puntúa todos los pedidos que podrían corresponder a un pago. No escribe: se
-- puede llamar para inspeccionar por qué el matcher decidió lo que decidió.
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
      (coalesce(pg.referencia_detalle, '') ~ ('\m' || ped.numero_pedido || '\M'))::int::numeric
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

-- Decide qué hacer con el mejor candidato de un pago y lo escribe.
--
-- Los errores no son simétricos: auto-confirmar de más esconde plata sin cobrar
-- para siempre, mientras que quedarse corto solo pone una fila en "Revisar" que
-- se resuelve con un clic. Por eso hay tres frenos antes de confirmar solo.
create or replace function conciliar_pago(p_pago_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $funcion$
declare
  mejor     record;
  siguiente numeric;
  decision  text;
begin
  -- Un pago ya conciliado no se re-evalúa: su fila confirmada es la verdad.
  if exists (select 1 from conciliaciones where pago_id = p_pago_id and estado = 'confirmado') then
    return;
  end if;

  select * into mejor from candidatos_de_pago(p_pago_id) limit 1;
  if mejor is null or mejor.score < leer_config_numero('umbral_revisar') then
    return;
  end if;

  select score into siguiente from candidatos_de_pago(p_pago_id) offset 1 limit 1;

  decision := case
    -- Freno 1: sin monto exacto no se auto-confirma nunca, por alto que dé el
    -- resto. Freno 2: dos candidatos casi empatados son una moneda al aire.
    when mejor.score >= leer_config_numero('umbral_auto')
      and (mejor.desglose ->> 'monto')::numeric = 1
      and coalesce(mejor.score - siguiente, 1) >= leer_config_numero('margen_desempate')
    then 'confirmado'
    else 'sugerido'
  end;

  insert into conciliaciones (pago_id, pedido_id, score, desglose, origen, estado, confirmado_at)
  values (
    p_pago_id, mejor.pedido_id, mejor.score, mejor.desglose, 'auto', decision,
    case when decision = 'confirmado' then now() end
  )
  on conflict (pago_id, pedido_id) do nothing;

  -- `pagado` solo cuando la base aceptó la fila confirmada: si el índice único
  -- la rechazó porque otro pago ya tapó ese pedido, el estado no puede mentir.
  update pedidos
  set estado_pago = case when decision = 'confirmado' then 'pagado' else 'revisar' end,
      updated_at = now()
  where id = mejor.pedido_id
    and estado_pago in ('pendiente', 'revisar')
    and (decision = 'sugerido' or exists (
      select 1 from conciliaciones
      where pago_id = p_pago_id and pedido_id = mejor.pedido_id and estado = 'confirmado'
    ));
end;
$funcion$;

revoke execute on function conciliar_pago(uuid) from public;
revoke execute on function conciliar_pago(uuid) from anon, authenticated;

-- Un pago nuevo busca su pedido apenas entra.
create or replace function disparar_conciliar_pago()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $funcion$
begin
  perform conciliar_pago(new.id);
  return null;
end;
$funcion$;

revoke execute on function disparar_conciliar_pago() from public;
revoke execute on function disparar_conciliar_pago() from anon, authenticated;

create trigger pagos_concilian
after insert on pagos
for each row execute function disparar_conciliar_pago();

-- Y al revés: un pedido nuevo re-mira los pagos que todavía no encontraron
-- dueño. Sin esto, un pago que llega antes que su pedido —el comprador paga y
-- la tienda registra el pedido un minuto después— se quedaría huérfano para
-- siempre, porque nada volvería a mirarlo.
create or replace function disparar_conciliar_pedido()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $funcion$
declare
  huerfano uuid;
begin
  for huerfano in
    select p.id
    from pagos p
    where p.moneda = new.moneda
      and p.fecha_pago >= new.fecha_pedido - interval '1 day'
      and p.fecha_pago <= new.fecha_pedido + (leer_config_numero('ventana_dias') * interval '1 day')
      and not exists (
        select 1 from conciliaciones c where c.pago_id = p.id and c.estado = 'confirmado'
      )
  loop
    perform conciliar_pago(huerfano);
  end loop;

  return null;
end;
$funcion$;

revoke execute on function disparar_conciliar_pedido() from public;
revoke execute on function disparar_conciliar_pedido() from anon, authenticated;

-- `update of` y no `after update` a secas: `conciliar_pago` escribe
-- `estado_pago`, así que un trigger que reaccione a esa columna se llamaría a
-- sí mismo sin fin. Solo los campos que cambian a quién le calza el pago.
create trigger pedidos_concilian
after insert or update of total_centimos, cliente_nombre, fecha_pedido on pedidos
for each row execute function disparar_conciliar_pedido();
