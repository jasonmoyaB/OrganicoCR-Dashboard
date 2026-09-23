-- Performance advisor: `auth_rls_initplan` y `duplicate_index`.
--
-- `auth.uid()` pelado en una policy se evalúa una vez POR FILA. Envuelto en
-- `(select ...)` Postgres lo corre una sola vez por consulta (initPlan). Mismo
-- resultado, misma seguridad: solo cambia cuántas veces se calcula.
-- `alter policy` y no drop/create: no hay un instante sin policy.

alter policy "usuario autenticado lee pagos" on pagos
  using ((select auth.uid()) is not null);

alter policy conciliaciones_lee on conciliaciones
  using ((select auth.uid()) is not null);

alter policy "usuario autenticado lee pedidos" on pedidos
  using ((select auth.uid()) is not null);

alter policy "usuario autenticado marca el pedido pagado" on pedidos
  using ((select auth.uid()) is not null and estado_pago in ('pendiente', 'revisar'))
  with check ((select auth.uid()) is not null and estado_pago = 'pagado');

alter policy "el dueño ve sus suscripciones" on suscripciones_push
  using (usuario_id = (select auth.uid()));

alter policy "el dueño registra su navegador" on suscripciones_push
  with check (usuario_id = (select auth.uid()));

alter policy "el dueño actualiza su navegador" on suscripciones_push
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()));

alter policy "el dueño da de baja su navegador" on suscripciones_push
  using (usuario_id = (select auth.uid()));

-- La 20260914210000 creó un segundo índice trigram idéntico al de la
-- 20260911182122. Dos índices iguales = doble costo en cada insert/update de
-- pedidos sin ninguna ganancia. Queda el original.
drop index if exists pedidos_cliente_nombre_trgm;
