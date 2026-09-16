« [Spec](README.md)

# 8. Estrategia de pruebas

Lo que se testea son los invariantes que, si se rompen, hacen perder plata sin que nadie se entere.

| Qué | Cómo | Fase |
|---|---|---|
| Conversión de montos a céntimos | Unitario, incluyendo entrada no numérica (debe lanzar, no devolver `NaN`) | A |
| Mapeo de órdenes de WooCommerce | Unitario, incluyendo billing vacío y `date_created_gmt` sin zona | A |
| Derivación del estado inicial | Unitario, incluyendo estado desconocido | A |
| Verificación de firma HMAC | Unitario: firma válida, alterada, cuerpo alterado, firma ausente | A |
| Idempotencia del webhook | Entregar el mismo payload dos veces y verificar que hay una sola fila | A |
| **Un update de Woo no degrada un `pagado`** | Marcar pagado, reenviar webhook, verificar que sigue pagado | A |
| Una cancelación en Woo sí saca el pedido de la deuda | Reenviar con `status: cancelled`, verificar `anulado` | A |
| Aislamiento por RLS | Consultar con la publishable key sin sesión y verificar que devuelve `[]` | A |
| Extractor de correos | Unitario contra correos reales anonimizados. La suite crece con cada formato nuevo | B |
| Función de scoring | Tests SQL en `supabase/tests/matcher.sql` (`pnpm test:sql`), con pares conocidos y casos frontera alrededor de cada umbral | C |
| Invariante 1:1 | Intentar confirmar dos conciliaciones para el mismo pago y verificar que Postgres lo rechaza | C |
| Texto del aviso de pago | Unitario sobre `mensaje-pago.ts`: monto con y sin céntimos, nombre de Davibank con guiones bajos, pago del BAC sin nombre, tag distinto por pago | E |
| Base64url → bytes | Unitario, incluyendo el relleno que base64url omite y los 65 bytes de una llave VAPID real | E |
| Sección inicial desde la URL | Unitario: parámetro válido, ausente, inventado, y conviviendo con otros | E |
| Policy de `suscripciones_push` | Por REST con la publishable key: con sesión guarda y vuelve a guardar (upsert); sin sesión, `401` | E |
| Cadena completa del push | `insert into pagos` contra un servicio de push falso: verificar `aes128gcm`, el JWT VAPID, que el 201 marca `ultimo_envio_at` y que el 410 borra la fila | E |

## El invariante crítico

**Un `order.updated` de WooCommerce no puede revertir un pedido ya conciliado.**

Es el que protege todo el trabajo de la Fase C. Sin él, editar una nota de un pedido en la tienda borraría en silencio una conciliación confirmada, y el pedido volvería a aparecer como deuda. Se verifica explícitamente en [`plans/fase-a/12-webhook.md`](../plans/fase-a/12-webhook.md).

## Criterio de corrección

```bash
pnpm typecheck
pnpm test
supabase db reset
```

Los tres sin errores. Si falla alguno, el código está incompleto.

Y los dos que no entran en esa lista pero cierran el circuito:

```bash
pnpm test:sql                            # matcher y resolver_conciliacion
pnpm dlx react-doctor@latest --verbose   # debe dar 100/100
```

## Lo que no se puede testear en CI

**El PWA y el push necesitan un navegador de verdad.** `pnpm dev` no registra el service worker a propósito, así que la única prueba local es `pnpm build && pnpm preview` más un Chrome apuntado ahí. Lo que hay que ver: `Page.getAppManifest` sin errores, el worker `active`, la caché poblada y la app abriendo con la red apagada.

**Los tres `sw*.js` no los mira ni `oxlint` ni `tsc`**, porque viven en `/public`. Son los únicos archivos del proyecto sin red de seguridad: se revisan a mano.

---

« [Fases](07-fases.md) · [Pendientes →](09-pendientes.md)
