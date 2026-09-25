« [Spec](README.md)

# 9. Decisiones pendientes

| # | Pendiente | Cuándo se resuelve | Bloquea |
|---|---|---|---|
| D1 | Remitente y plantilla del correo del banco | **Cerrado el 2026-09-14** contra el buzón real | No |
| D2 | Valores finales de los umbrales de matching | Tras 2 semanas de datos reales | No — arranca con las estimaciones de [05-datos](05-datos.md) |
| D3 | Ventana de tiempo del matching (7 días como punto de partida) | Fase C, con datos | No |
| D4 | Si se agrega la instrucción de escribir el # de pedido en el checkout de Woo | Decisión del cliente | No — el matcher ya aprovecha la referencia cuando existe |
| D5 | Formato de los avisos del BAC | **Cerrado el 2026-09-14**: `notificaciones@baccredomatic.cr`, cuatro redacciones | No |
| D7 | Si las empresas también deben auto-conciliarse | Decisión de riesgo del dueño | No — hoy caen todas en "Revisar" |
| ~~D8~~ | ~~Cuándo se despliega el frontend a Vercel~~ → **desplegado**: https://organico-cr-dashboard.vercel.app/ | — | — |
| D9 | Que el buzón de cPanel escriba `Authentication-Results` con DMARC | Config del hosting (Bluehost) | **Sí, la auto-confirmación**: sin esa cabecera todo pago cae en "Revisar" |
| D10 | Un pago que cubre varios pedidos o facturas | Decisión de alcance | No — el matcher es 1:1 (R5) y esos casos quedan en "Revisar" |
| D11 | Fase F (facturas de GTI) y con cuál opción | Decisión del cliente | No — ver [10-fase-f-facturas.md](10-fase-f-facturas.md) |
| D12 | Fase G: si `recepcion@` acepta reenvíos (DMARC), si hay que reenviar el histórico, qué son los correos de `notificaciones@facturaelectronica.cr` | Prueba real + cliente | No — ver [11-fase-g-mandarcorreos.md](11-fase-g-mandarcorreos.md) |
| ~~D6~~ | ~~Si `pg_trgm` se mueve del esquema `public` a `extensions`~~ → movida en `20260923164122` | — | — |

## D1 y D5 — cerrados contra el buzón real

El 2026-09-14 la Edge Function corrió contra `info@organicocr.store` de verdad, y ahí se acabó la adivinanza. Los dos remitentes son `servicioalcliente@davibank.cr` y `notificaciones@baccredomatic.cr`. Quedan fuera a propósito `Alertas@davibank.cr` (inicios de sesión) y `facturaelectronica@baccredomatic.cr` (gastos).

**La descripción del dueño estaba equivocada en dos cosas, y las dos costaban plata:** dijo que Davibank mandaba una sola redacción (manda tres, y el extractor perdía 8 de 17 ingresos) y que el separador decimal era el europeo (`12.036,00`) cuando es el anglosajón (`2,412.01`). El detalle completo está en [fases](07-fases.md).

**Por qué el BAC no alcanza para auto-confirmar:** el aviso no dice quién mandó la plata. El único nombre es el del titular, o sea el propio dueño. Sin nombre, el score no pasa de 0.75 y esos pagos siempre pasan por "Revisar". No es un bug del matcher, es lo que el banco manda.

## D7 — por qué las empresas no se auto-concilian

El techo de score para un pago de empresa es 0.80, contra un umbral de 0.85. Falta el término de la referencia (0.20) porque las plantillas de transferencia y pago inmediato no traen motivo escrito por quien paga.

Se arregla subiendo `peso_monto` en `config`, sin redeploy. Pero eso hace que un monto que coincide alcance para confirmar solo, y dos pedidos del mismo monto el mismo día dejan de ser una moneda al aire: pasan a ser un cobro mal aplicado. **Es una decisión de riesgo del dueño, no del código.**

## D6 — por qué `pg_trgm` seguía en `public` (resuelto el 2026-09-23)

Se movió. El índice referencia la operator class por OID y el matcher usa `similarity()`, que nunca pasó por el índice. Lo único que hubo que ajustar fue el `search_path` de `candidatos_de_pago`. Lo que sigue es el razonamiento original.

El linter de Supabase lo marca como `extension_in_public`. El riesgo que describe es colisión de nombres: cualquiera puede crear una función `similarity()` en `public` y ganarle a la de la extensión.

Moverla hoy es peor negocio que dejarla. El índice `pedidos_cliente_nombre_trgm_idx` usa `gin_trgm_ops`, que vive dentro de la extensión: si el esquema nuevo no queda en el `search_path` de todos los roles que tocan la tabla, el índice deja de usarse y el matching de la Fase C se degrada a scan secuencial sin avisar.

Se reevalúa cuando el matching exista y se pueda medir si sigue usando el índice después de mover la extensión.

## Lo que ya no está pendiente

Resuelto contra la tienda real el 2026-09-11:

- ~~Qué estado usa WooCommerce para pedidos sin pagar~~ → `processing` y `on-hold`; `pending` no se usa
- ~~Si hay ventas en dólares~~ → no, todo CRC sin decimales
- ~~Si el objeto de pedido trae alguna referencia de pago~~ → no
- ~~Cómo autenticar contra la API de WooCommerce~~ → query string; el hosting descarta el header `Authorization`

Resuelto el 2026-09-14 contra el buzón real:

- ~~Remitente y plantilla de Davibank~~ → tres redacciones, todas en `_extractor/plantillas-davibank.ts`
- ~~Remitente y plantilla del BAC~~ → `notificaciones@baccredomatic.cr`, cuatro redacciones
- ~~Si la IP de las Edge Functions estaría bloqueada por cPHulk~~ → no; la función sale desde AWS, no desde la máquina de Jason. Funcionó al primer intento
- ~~Si haría falta el respaldo LLM~~ → se hizo igual, como seguro ante un cambio de plantilla; desplegado el 2026-09-21. Sobre 313 correos reales no se activó nunca

---

« [Pruebas](08-pruebas.md) · [Spec](README.md)
