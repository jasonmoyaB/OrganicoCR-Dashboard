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

  -- Un numero de pedido con metacaracteres de regex no puede tumbar el ingest.
  -- El `[` sin cerrar hacia que el patron no compilara, y como el matcher cuelga
  -- del INSERT en `pagos`, la excepcion abortaba la sentencia: a partir de ese
  -- pedido no se guardaba ni un pago mas.
  pedido := pedido_de_prueba('FACT-[2026', 'Cliente Envenenado', 99000009);
  pago   := pago_de_prueba('Ana Lopez', 99000010, 'pago de Ana');
  if not exists (select 1 from pagos where id = pago) then
    raise exception 'un numero de pedido con [ no tendria que impedir guardar el pago';
  end if;

  -- Que no reviente no alcanza: el escape tiene que seguir buscando el numero.
  -- La primera version producia una backreference (`FACT-\12026`) en vez de
  -- barra + caracter, asi que no rompia pero tampoco encontraba nada. El caso de
  -- arriba pasaba igual, porque ningun pedido real trae metacaracteres.
  if not ('ref FACT-[2026 fin' ~ ('\m' || escapar_regex('FACT-[2026') || '\M')) then
    raise exception 'el numero escapado tendria que coincidir consigo mismo, dio %',
      escapar_regex('FACT-[2026');
  end if;

  -- La variante silenciosa: el punto es un comodin. Sin escapar, el pedido
  -- "1.2" daria positivo dentro de "112" e imputaria la plata al equivocado.
  pedido := pedido_de_prueba('1.2', 'Cliente Punto', 99000011);
  pago   := pago_de_prueba('Nombre Que No Se Parece', 99000011, 'pago 112');
  if (select (desglose ->> 'referencia')::numeric
      from conciliaciones where pago_id = pago) = 1 then
    raise exception '"1.2" no tendria que coincidir con "112"';
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

-- El escenario se arma como `postgres`, antes de cambiar de rol: las funciones
-- de arriba escriben en `pedidos` directamente y `authenticated` no puede.
create temporary table caso_resolver (etiqueta text primary key, pedido uuid, conciliacion uuid);
grant select on caso_resolver to authenticated;

do $armar$
declare
  pedido uuid;
  pago   uuid;
begin
  pedido := pedido_de_prueba('9101', 'Ferreteria El Tornillo', 99000101);
  pago   := pago_de_prueba('FERRETERIA EL TORNI', 99000101, null);
  insert into caso_resolver
  values ('confirmar', pedido, (select id from conciliaciones where pago_id = pago));

  pedido := pedido_de_prueba('9102', 'Panaderia Dos Pinos', 99000102);
  pago   := pago_de_prueba('PANADERIA DOS PINOS', 99000102, null);
  insert into caso_resolver
  values ('descartar', pedido, (select id from conciliaciones where pago_id = pago));
end;
$armar$;

-- `resolver_conciliacion` exige sesión y lee el email del JWT, así que se pone
-- uno a mano. Sin esto la función aborta antes de llegar a lo que se prueba.
set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "email": "prueba@organicocr.store"}';

do $resolver$
declare
  caso caso_resolver;
begin
  -- Confirmar a mano deja el pedido cobrado y con nombre de quien lo aprobo.
  select * into caso from caso_resolver where etiqueta = 'confirmar';
  perform resolver_conciliacion(caso.conciliacion, true);

  if (select estado_pago from pedidos where id = caso.pedido) is distinct from 'pagado' then
    raise exception 'confirmar tendria que dejar el pedido en pagado';
  end if;
  if (select confirmado_por from conciliaciones where id = caso.conciliacion) is distinct
     from 'prueba@organicocr.store' then
    raise exception 'tendria que quedar registrado quien confirmo';
  end if;

  -- Una conciliacion ya resuelta no se vuelve a resolver: sin este freno, dos
  -- clics seguidos escribirian dos veces.
  begin
    perform resolver_conciliacion(caso.conciliacion, false);
    raise exception 'no tendria que dejar resolver dos veces la misma conciliacion';
  exception
    when others then
      if sqlerrm not like '%ya est%' then raise; end if;
  end;

  -- Descartar devuelve el pedido a "Deben": uno sin candidatos vivos no puede
  -- quedarse en "Revisar", porque ahi nadie lo volveria a mirar.
  select * into caso from caso_resolver where etiqueta = 'descartar';
  perform resolver_conciliacion(caso.conciliacion, false);

  if (select estado_pago from pedidos where id = caso.pedido) is distinct from 'pendiente' then
    raise exception 'descartar tendria que devolver el pedido a pendiente';
  end if;

  raise notice 'resolver_conciliacion: todas las pruebas pasaron';
end;
$resolver$;

reset role;

rollback;
