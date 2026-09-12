-- Endurece la escritura sobre pedidos.
--
-- La policy de update de la fase A era `using (true) with check (true)`:
-- cualquier sesión autenticada podía reescribir CUALQUIER columna de CUALQUIER
-- fila, total_centimos incluido. Eso contradice dos cosas escritas: la
-- invariante de datos —pedidos es un espejo de solo lectura de WooCommerce
-- salvo estado_pago— y la regla de seguridad del proyecto, que exige
-- `auth.uid() is not null` en toda policy.
--
-- La migración 20260911182122 no se toca: ya está aplicada en producción. El
-- estado final de la tabla se corrige acá.

drop policy "usuario autenticado actualiza pedidos" on pedidos;

-- Una policy no puede limitar columnas; eso es privilegio de columna. Sin esto,
-- estado_pago sería lo único que la app escribe pero no lo único que la
-- publishable key PODRÍA escribir.
revoke update on pedidos from authenticated;
grant update (estado_pago) on pedidos to authenticated;

-- 'anulado' no está en el with check a propósito: anular es decisión del ingest
-- de WooCommerce (secret key, salta RLS), no del dashboard. Y un pedido ya
-- anulado no se vuelve a tocar desde el cliente — de ahí el using.
create policy "usuario autenticado marca el estado de pago"
  on pedidos for update
  to authenticated
  using (auth.uid() is not null and estado_pago <> 'anulado')
  with check (
    auth.uid() is not null
    and estado_pago in ('pendiente', 'revisar', 'pagado')
  );
