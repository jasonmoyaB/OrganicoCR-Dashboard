-- El libro de plata no tenía control de integridad.
--
-- `pedidos` hizo lo correcto en la 20260911205500: revocar UPDATE y devolver
-- solo la columna que el dashboard necesita (`grant update (estado_pago)`).
-- `conciliaciones` quedó a medias: la 20260914210000 revocó insert, delete y
-- truncate, pero no UPDATE, y la policy `conciliaciones_resuelve` solo pedía
-- sesión — no miraba `estado` ni podía limitar columnas, porque una policy no
-- puede hacerlo.
--
-- Con eso, un PATCH a /rest/v1/conciliaciones se saltaba las dos garantías que
-- justifican que `resolver_conciliacion` exista. Verificado contra el stack
-- local: una conciliación ya confirmada pasó a `descartado` con score 0 y
-- `confirmado_por = 'atacante@evil.test'`, devolviendo HTTP 200, y el pedido
-- quedó `pagado` sin pago que lo respalde. En otra prueba el pago se re-apuntó
-- a un pedido de otro monto y se volvió a confirmar.
--
-- `confirmado_por` es el campo que dice quién cobró: que sea texto libre
-- escribible por el cliente vacía la auditoría justo donde más se necesita.
--
-- No hay nada que migrar en el dashboard: `conciliaciones-service.ts` ya lee con
-- SELECT y escribe únicamente por el RPC. `resolver_conciliacion` es
-- `security definer`, así que sigue pudiendo escribir con o sin este grant.
--
-- El registro público está cerrado en la nube, así que hoy el único principal
-- `authenticated` es el dueño. Esto no cierra un agujero abierto a internet:
-- cierra el que queda si alguna vez se roba un access token.

drop policy if exists conciliaciones_resuelve on conciliaciones;

revoke update on conciliaciones from anon, authenticated;
