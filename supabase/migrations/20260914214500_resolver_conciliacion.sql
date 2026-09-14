-- Confirmar o descartar una sugerencia desde el dashboard.
--
-- Va en una función y no en dos updates desde el cliente porque son dos
-- escrituras que tienen que pasar juntas o ninguna: marcar el pedido `pagado`
-- y que después el índice único rechace la conciliación dejaría un pedido
-- cobrado sin pago que lo respalde.
create or replace function resolver_conciliacion(p_conciliacion_id uuid, p_confirmar boolean)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $funcion$
declare
  fila conciliaciones;
begin
  -- `security definer` salta RLS, así que la sesión se verifica a mano. Sin
  -- esto la función sería una puerta lateral a las policies de la tabla.
  if auth.uid() is null then
    raise exception 'Hace falta una sesión para resolver una conciliación';
  end if;

  select * into fila from conciliaciones where id = p_conciliacion_id;
  if fila is null then
    raise exception 'La conciliación % no existe', p_conciliacion_id;
  end if;

  if fila.estado <> 'sugerido' then
    raise exception 'La conciliación ya está %, no se puede volver a resolver', fila.estado;
  end if;

  update conciliaciones
  set estado = case when p_confirmar then 'confirmado' else 'descartado' end,
      origen = 'manual',
      confirmado_por = auth.jwt() ->> 'email',
      confirmado_at = now()
  where id = p_conciliacion_id;

  if p_confirmar then
    update pedidos set estado_pago = 'pagado', updated_at = now() where id = fila.pedido_id;
    return;
  end if;

  -- Descartada: el pedido vuelve a "Deben", salvo que otra sugerencia siga
  -- esperando respuesta. Un pedido sin candidatos vivos no puede quedarse en
  -- "Revisar", porque ahí nadie lo volvería a mirar.
  update pedidos
  set estado_pago = case
        when exists (
          select 1 from conciliaciones
          where pedido_id = fila.pedido_id and estado = 'sugerido' and id <> p_conciliacion_id
        ) then 'revisar'
        else 'pendiente'
      end,
      updated_at = now()
  where id = fila.pedido_id;
end;
$funcion$;

-- Esta sí la llama el dashboard, así que `authenticated` la ejecuta. `anon` no:
-- la publishable key sola, sin sesión, no resuelve nada.
revoke execute on function resolver_conciliacion(uuid, boolean) from public;
revoke execute on function resolver_conciliacion(uuid, boolean) from anon;
grant execute on function resolver_conciliacion(uuid, boolean) to authenticated;
