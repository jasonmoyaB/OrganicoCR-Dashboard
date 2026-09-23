-- Las dos policies de `pedidos` para el navegador, cerradas a lo que el
-- dashboard hace de verdad.
--
-- UPDATE: la 20260911205500 dejaba escribir `pendiente`, `revisar` o `pagado`
-- sobre cualquier pedido no anulado. Con eso un pedido `pagado` —con su
-- conciliación confirmada detrás— podía volver a `pendiente`, y el matcher no lo
-- miraba nunca más. Verificado el 2026-09-23 con un PATCH que respondió 200. El
-- frontend solo escribe `pagado` (`marcarPedidoPagado`), y deshacer un cobro es
-- una decisión que no se toma desde un botón. La invariante 2 lo dice para Woo
-- ("un pagado nunca se degrada"), y acá vale igual para el navegador.
--
-- SELECT: era `using (true)`, contra la regla del proyecto de exigir
-- `auth.uid() is not null` en toda policy. Hoy no se podía explotar, porque el
-- registro está cerrado, pero la regla existe para no depender de eso.

drop policy "usuario autenticado marca el estado de pago" on pedidos;

create policy "usuario autenticado marca el pedido pagado"
  on pedidos for update
  to authenticated
  using (auth.uid() is not null and estado_pago in ('pendiente', 'revisar'))
  with check (auth.uid() is not null and estado_pago = 'pagado');

drop policy "usuario autenticado lee pedidos" on pedidos;

create policy "usuario autenticado lee pedidos"
  on pedidos for select
  to authenticated
  using (auth.uid() is not null);
