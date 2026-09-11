« [Spec](README.md)

# 9. Decisiones pendientes

| # | Pendiente | Cuándo se resuelve | Bloquea |
|---|---|---|---|
| D1 | Remitente exacto y formato de plantilla del correo del banco | Al empezar Fase B — hacen falta correos reales de muestra | **Sí**: el regex del extractor |
| D2 | Valores finales de los umbrales de matching | Tras 2 semanas de datos reales | No — arranca con las estimaciones de [05-datos](05-datos.md) |
| D3 | Ventana de tiempo del matching (7 días como punto de partida) | Fase C, con datos | No |
| D4 | Si se agrega la instrucción de escribir el # de pedido en el checkout de Woo | Decisión del cliente | No — el matcher ya aprovecha la referencia cuando existe |
| D5 | Si los correos de transferencia `bacs` llegan en un formato distinto al de SINPE | Fase B, junto con D1 | **Sí**: puede requerir dos parsers en vez de uno |

## D1 y D5 — lo único que bloquea trabajo

Ambos se resuelven pidiéndole al cliente que reenvíe unos cuantos correos de notificación del banco: idealmente varios de SINPE y varios de transferencia bancaria.

D5 apareció al revisar la tienda real: los pedidos usan tres métodos de pago manuales distintos y ninguno indica por qué vía entró la plata. Ver [referencia de la tienda](../referencia/tienda-woocommerce.md).

## Lo que ya no está pendiente

Resuelto contra la tienda real el 2026-09-11:

- ~~Qué estado usa WooCommerce para pedidos sin pagar~~ → `processing` y `on-hold`; `pending` no se usa
- ~~Si hay ventas en dólares~~ → no, todo CRC sin decimales
- ~~Si el objeto de pedido trae alguna referencia de pago~~ → no
- ~~Cómo autenticar contra la API de WooCommerce~~ → query string; el hosting descarta el header `Authorization`

---

« [Pruebas](08-pruebas.md) · [Spec](README.md)
