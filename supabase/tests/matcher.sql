-- Pruebas del matcher. Corren dentro de una transacción que siempre termina en
-- rollback: no dejan rastro en la base.
--
--   pnpm test:sql
--
-- Cada caso usa un monto propio e irrepetible, así los escenarios no se cruzan
-- entre sí ni con los pedidos reales que haya cargados.

begin;

create or replace function pedido_de_prueba(p_numero text, p_nombre text, p_centimos bigint)
returns uuid language sql as $$
  insert into pedidos (woo_order_id, numero_pedido, cliente_nombre, total_centimos,
                       estado_woo, estado_pago, fecha_pedido, raw)
  values ((random() * 1e9)::bigint, p_numero, p_nombre, p_centimos,
          'processing', 'pendiente', now(), '{}'::jsonb)
  returning id;
$$;

create or replace function pago_de_prueba(p_nombre text, p_centimos bigint, p_referencia text)
returns uuid language plpgsql as $$
declare
  clave  text := gen_random_uuid()::text;
  correo bigint;
  nuevo  uuid;
begin
  insert into correos_banco (mensaje_id, remitente, cuerpo, recibido_at, procesado_ok)
  values (clave, 'servicioalcliente@davibank.cr', 'crudo', now(), true)
  returning id into correo;

  insert into pagos (correo_id, mensaje_id, remitente_nombre, monto_centimos,
                     referencia_detalle, fecha_pago, metodo_extraccion, cuerpo_correo)
  values (correo, clave, p_nombre, p_centimos, p_referencia, now(), 'regex', 'crudo')
  returning id into nuevo;

  return nuevo;
end;
$$;

create or replace function estado_de(p_pago uuid)
returns text language sql as $$
  select estado from conciliaciones where pago_id = p_pago order by score desc limit 1;
$$;

do $prueba$
declare
  pedido uuid;
  pago   uuid;
  otro   uuid;
  fallo  text;
begin
  -- El nombre llega truncado a 20 caracteres y sin motivo escrito: es el caso
  -- típico de una empresa que paga por transferencia. Monto exacto y mismo día
  -- no alcanzan para confirmar solo.
  pedido := pedido_de_prueba('9001', 'Imperio Pesquero del Pacifico S.A.', 99000001);
  pago   := pago_de_prueba('IMPERIO PESQUERO DEL', 99000001, null);
  if estado_de(pago) is distinct from 'sugerido' then
    raise exception 'sin referencia tendria que sugerir, dio %', estado_de(pago);
  end if;
  if (select estado_pago from pedidos where id = pedido) is distinct from 'revisar' then
    raise exception 'el pedido sugerido tendria que quedar en revisar';
  end if;

  -- El mismo pago, pero con el número de pedido escrito en el motivo.
  pedido := pedido_de_prueba('9002', 'Imperio Pesquero del Pacifico S.A.', 99000002);
  pago   := pago_de_prueba('IMPERIO PESQUERO DEL', 99000002, 'Pago 9002 -87138944');
  if estado_de(pago) is distinct from 'confirmado' then
    raise exception 'con referencia tendria que confirmar, dio %', estado_de(pago);
  end if;
  if (select estado_pago from pedidos where id = pedido) is distinct from 'pagado' then
    raise exception 'el pedido confirmado tendria que quedar en pagado';
  end if;

  -- Freno 1: nombre idéntico y referencia escrita, pero el monto no cuadra.
  -- Nunca se auto-confirma sin monto exacto, por alto que dé el resto.
  pedido := pedido_de_prueba('9003', 'Panaderia La Esquina', 99000003);
  pago   := pago_de_prueba('Panaderia La Esquina', 99000099, 'Pago 9003');
  if coalesce(estado_de(pago), 'ninguno') = 'confirmado' then
    raise exception 'sin monto exacto no puede confirmar';
  end if;

  -- Freno 2: dos pedidos idénticos el mismo día. Acertar sería una moneda al
  -- aire, y acertar mal esconde plata sin cobrar para siempre.
  pedido := pedido_de_prueba('9004', 'Verduras del Valle', 99000004);
  otro   := pedido_de_prueba('9005', 'Verduras del Valle', 99000004);
  pago   := pago_de_prueba('Verduras del Valle', 99000004, null);
  if estado_de(pago) is distinct from 'sugerido' then
    raise exception 'dos candidatos empatados tendrian que sugerir, dio %', estado_de(pago);
  end if;

  -- El borde de palabra del patrón de referencia: "69" no puede dar positivo
  -- dentro de "1069" e inventar una coincidencia.
  pedido := pedido_de_prueba('1069', 'Cliente Equis', 99000006);
  pago   := pago_de_prueba('Nombre Que No Se Parece', 99000006, 'pago 69');
  if (select (desglose ->> 'referencia')::numeric
      from conciliaciones where pago_id = pago) = 1 then
    raise exception '"69" no tendria que coincidir con el pedido 1069';
  end if;

  -- R5, impuesto por la base: dos pagos no pueden confirmar el mismo pedido.
  -- Lo tiene que rechazar Postgres, no el código de aplicación.
  pedido := pedido_de_prueba('9007', 'Cliente Doble', 99000007);
  pago   := pago_de_prueba('Cliente Doble', 99000007, 'Pago 9007');
  begin
    insert into conciliaciones (pago_id, pedido_id, score, desglose, origen, estado)
    values (pago_de_prueba('Otro Pagador', 99000007, null), pedido, 0.9,
            '{}'::jsonb, 'manual', 'confirmado');
    raise exception 'la base tendria que rechazar dos conciliaciones confirmadas del mismo pedido';
  exception
    when unique_violation then null;
  end;

  -- Fuera de la ventana no hay candidato posible.
  pedido := pedido_de_prueba('9008', 'Cliente Viejo', 99000008);
  update pedidos set fecha_pedido = now() - interval '60 days' where id = pedido;
  pago := pago_de_prueba('Cliente Viejo', 99000008, 'Pago 9008');
  if estado_de(pago) is not null then
    raise exception 'un pago fuera de la ventana no tendria que conciliar';
  end if;

  raise notice 'matcher: todas las pruebas pasaron';
end;
$prueba$;

rollback;
