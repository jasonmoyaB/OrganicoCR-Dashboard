-- Guardia contra los avisos del linter de Supabase que ya se cerraron. Si una
-- migración nueva los reabre, `pnpm test:sql` falla en local, antes de que
-- lleguen a la nube.
--
--   pnpm test:sql

do $$
declare
  -- Las únicas `security definer` que el dashboard llama con sesión. Las dos
  -- verifican `auth.uid()` adentro. Sumar una a esta lista es una decisión de
  -- seguridad, no un trámite.
  permitidas_authenticated constant text[] := array[
    'resolver_conciliacion', 'resumen_correos_sin_procesar'
  ];
  fallas text;
begin
  select string_agg(extname, ', ') into fallas
  from pg_extension e join pg_namespace n on n.oid = e.extnamespace
  where n.nspname = 'public';
  if fallas is not null then
    raise exception 'Extensiones en public (van en extensions): %', fallas;
  end if;

  select string_agg(p.oid::regprocedure::text, ', ') into fallas
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prosecdef
    and (has_function_privilege('anon', p.oid, 'execute')
         or (has_function_privilege('authenticated', p.oid, 'execute')
             and p.proname <> all (permitidas_authenticated)));
  if fallas is not null then
    raise exception 'security definer ejecutable desde el navegador (faltan los dos revokes): %', fallas;
  end if;

  raise notice 'seguridad: ok';
end $$;

-- Lo que el navegador puede escribir. Todo dentro de una transacción que
-- termina en rollback.
begin;

-- `enviar-push` le hace POST al endpoint: solo servicios de push reales. Como
-- postgres, para que ni RLS ni la FK del usuario (que se evalúa después)
-- puedan hacer pasar la prueba por el motivo equivocado.
do $$
begin
  insert into suscripciones_push (usuario_id, endpoint, p256dh, auth)
  values (gen_random_uuid(), 'http://kong:8000/rest/v1/', 'x', 'x');
  raise exception 'se aceptó un endpoint de push interno';
exception when check_violation then null;
end $$;

insert into pedidos (woo_order_id, numero_pedido, cliente_nombre, total_centimos,
                     estado_woo, estado_pago, fecha_pedido, raw)
values (-424242, 'SEG-1', 'Prueba Seguridad', 100, 'completed', 'pagado', now(), '{}'),
       (-424243, 'SEG-2', 'Prueba Seguridad', 100, 'on-hold', 'pendiente', now(), '{}');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

do $$
declare
  filas int;
begin
  -- Lo que el dashboard sí hace tiene que seguir andando: si no, la prueba de
  -- abajo pasaría igual con una policy que lo bloquea todo.
  update pedidos set estado_pago = 'pagado' where woo_order_id = -424243;
  get diagnostics filas = row_count;
  if filas <> 1 then
    raise exception 'el navegador no pudo marcar pagado un pedido pendiente';
  end if;

  -- Un pedido cobrado no vuelve a "Deben" desde el navegador.
  update pedidos set estado_pago = 'pendiente' where woo_order_id = -424242;
  get diagnostics filas = row_count;
  if filas <> 0 then
    raise exception 'el navegador pudo degradar un pedido pagado';
  end if;

  raise notice 'seguridad (rol authenticated): ok';
end $$;

rollback;
