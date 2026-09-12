« [Spec](README.md)

# 9. Decisiones pendientes

| # | Pendiente | Cuándo se resuelve | Bloquea |
|---|---|---|---|
| D1 | Remitente y plantilla del correo del banco | **Parcial**: Davibank resuelto el 2026-09-12. Falta el BAC | Ya no bloquea Davibank |
| D2 | Valores finales de los umbrales de matching | Tras 2 semanas de datos reales | No — arranca con las estimaciones de [05-datos](05-datos.md) |
| D3 | Ventana de tiempo del matching (7 días como punto de partida) | Fase C, con datos | No |
| D4 | Si se agrega la instrucción de escribir el # de pedido en el checkout de Woo | Decisión del cliente | No — el matcher ya aprovecha la referencia cuando existe |
| D5 | Formato de los avisos del BAC | Cuando el dueño reenvíe uno | **Sí**: el BAC necesita su propio extractor |
| D6 | Si `pg_trgm` se mueve del esquema `public` a `extensions` | Fase C, si el matching por trigrama llega a producción | No |

## D1 — Davibank resuelto, BAC pendiente

El dueño confirmó el 2026-09-12 que los avisos llegan de **`servicioalcliente@davibank.cr`**, con esta forma:

> Davibank le informa ha recibido {cantidad} colones de {persona} al SINPE Móvil

Con eso se escribió `extraer-davibank.ts`. **Ojo: el patrón viene de la descripción del dueño, no de un correo real.** Es laxo en lo accesorio (verbo, espacios, acentos, símbolo de moneda) y estricto en el monto — si no lo puede leer devuelve `null` en vez de inventar una cifra. Hay que validarlo contra un correo de verdad antes de confiar en él.

**El BAC sigue abierto (D5).** El dueño dijo que también recibe avisos de ahí, pero no se conoce su remitente ni su plantilla. Hasta que se sepan, esos correos se capturan igual en `correos_banco` y caen al respaldo LLM: el dispatcher `extraer-pago.ts` es un map de handlers, así que sumar el BAC es agregar una línea.

Lo que hace falta: **un aviso reenviado de cada banco.** Uno de Davibank para validar el regex, uno del BAC para escribir el suyo.

## D6 — por qué `pg_trgm` sigue en `public`

El linter de Supabase lo marca como `extension_in_public`. El riesgo que describe es colisión de nombres: cualquiera puede crear una función `similarity()` en `public` y ganarle a la de la extensión.

Moverla hoy es peor negocio que dejarla. El índice `pedidos_cliente_nombre_trgm_idx` usa `gin_trgm_ops`, que vive dentro de la extensión: si el esquema nuevo no queda en el `search_path` de todos los roles que tocan la tabla, el índice deja de usarse y el matching de la Fase C se degrada a scan secuencial sin avisar.

Se reevalúa cuando el matching exista y se pueda medir si sigue usando el índice después de mover la extensión.

## Lo que ya no está pendiente

Resuelto contra la tienda real el 2026-09-11:

- ~~Qué estado usa WooCommerce para pedidos sin pagar~~ → `processing` y `on-hold`; `pending` no se usa
- ~~Si hay ventas en dólares~~ → no, todo CRC sin decimales
- ~~Si el objeto de pedido trae alguna referencia de pago~~ → no
- ~~Cómo autenticar contra la API de WooCommerce~~ → query string; el hosting descarta el header `Authorization`

---

« [Pruebas](08-pruebas.md) · [Spec](README.md)
