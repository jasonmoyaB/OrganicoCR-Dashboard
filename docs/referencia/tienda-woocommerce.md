« [Índice](../README.md)

# Tienda WooCommerce — hechos verificados

Todo lo de este archivo se comprobó contra la tienda real el **2026-09-11**, no es supuesto. Si algo del código no se comporta como esperás, revisá acá primero.

- **URL:** `https://organicocr.store`
- **Hosting:** Bluehost
- **WooCommerce:** 11.1.0
- **Moneda:** CRC, **sin decimales** — la API devuelve `"1965"`, no `"1965.00"`

## La autenticación va por query string

El hosting descarta el header `Authorization` antes de que llegue a WordPress. Con Basic Auth la API responde `401 woocommerce_rest_cannot_view` aunque las credenciales sean correctas.

```bash
# NO funciona en esta tienda
curl -u "ck_xxx:cs_xxx" "https://organicocr.store/wp-json/wc/v3/orders"

# Sí funciona
curl "https://organicocr.store/wp-json/wc/v3/orders?consumer_key=ck_xxx&consumer_secret=cs_xxx"
```

Diagnóstico rápido por código de error:

| Respuesta | Causa |
|---|---|
| `rest_no_route` | Permalinks en "Simple" — cambiar a "Nombre de la entrada" |
| `woocommerce_rest_authentication_error` | Secret incorrecto, o falta el par `ck:cs` |
| `woocommerce_rest_cannot_view` con `401` | El header `Authorization` se perdió — usar query string |
| `woocommerce_rest_cannot_view` con `403` | El usuario dueño de la key no es admin ni Shop manager |

## `status=any` es obligatorio

Sin ese parámetro WooCommerce omite estados de la respuesta y se pierden pedidos silenciosamente.

```
/wp-json/wc/v3/orders?per_page=100&status=any&orderby=date&order=asc
```

## `date_created_gmt` viene sin zona horaria

La API devuelve `"2026-09-07T17:34:26"` — sin `Z`, aunque el campo se llame `_gmt`. Pasarlo a `new Date()` tal cual lo interpreta en la zona local del servidor y desplaza cada pedido seis horas en Costa Rica.

```ts
new Date(`${orden.date_created_gmt}Z`).toISOString()
```

## Estados de pedido reales

14 pedidos al 2026-09-11:

| Estado | N | Nota |
|---|---|---|
| `completed` | 10 | 8 son pedidos de prueba del desarrollador (620–772) |
| `processing` | 2 | 1063, 1064 — ventas reales |
| `on-hold` | 1 | 1062 — venta real |
| `cancelled` | 1 | 671 — prueba |
| `pending` | 0 | **este estado no se usa en esta tienda** |

Deuda real al arrancar: pedidos **1062** (₡12 036), **1063** (₡8 614) y **1064** (₡13 195) — **₡33 845**.

## Métodos de pago — los tres son manuales

Ninguno tiene pasarela. Ninguno confirma el pago por sí solo. Los tres requieren conciliación.

| `payment_method` | `payment_method_title` | N |
|---|---|---|
| `cod` | **Sinpe Movil/Tarjeta** | 11 |
| `bacs` | Transferencia bancaria directa | 2 |
| `cheque` | Pagos por cheque | 1 |

**`cod` está renombrado a "Sinpe Movil/Tarjeta".** El identificador dice "cash on delivery" pero no lo es. Y el título mezcla SINPE con tarjeta, así que el método de pago **no permite deducir** por qué vía entró la plata — dato relevante para el agente de correo de la Fase B, que tendrá que cubrir SINPE y transferencia bancaria por igual.

## No hay campo de referencia de pago

El objeto `billing` no trae ningún campo donde el comprador escriba el número de factura. Confirma la restricción R6 del spec: el matching de la Fase C depende del scoring, no de una referencia confiable.

Según el cliente, quien paga facturas **a veces** escribe el número en el detalle SINPE, pero la mayoría no escribe nada.

## Credenciales

**Ya están cargadas en `.env.local`, en la raíz del proyecto.** No hay que generarlas de nuevo ni pedírselas a nadie: son permanentes y es la fuente de verdad para todo el proyecto.

```
WOO_URL=https://organicocr.store
WOO_CONSUMER_KEY=ck_...
WOO_CONSUMER_SECRET=cs_...
```

`.env.local` está en `.gitignore` y nunca se commitea. `.env.example` tiene la misma estructura sin valores, y ese sí se commitea.

La key es de **solo lectura** (permisos "Lectura"). El sistema nunca escribe a la tienda — ver [principio P1](../specs/03-principios.md). Si alguna vez hiciera falta regenerarla:

```
https://organicocr.store/wp-admin/admin.php?page=wc-settings&tab=advanced&section=keys
```

El secret se muestra **una sola vez** al crearla. Si se pierde, no hay recuperación: hay que revocar la key y generar otra.

Nota del entorno: el proyecto vive dentro de OneDrive, así que `.env.local` se sincroniza a la nube de Microsoft junto con el resto de la carpeta. Está fuera de git, no fuera de OneDrive.

**El secreto del webhook es otra cosa.** `WOO_WEBHOOK_SECRET` lo generás vos y lo pegás al crear el webhook en WooCommerce → Ajustes → Avanzado → **Webhooks**. No tiene relación con la API key.

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

« [Índice](../README.md) · [Convenciones →](convenciones.md)
