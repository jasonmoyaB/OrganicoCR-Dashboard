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
| Aislamiento por RLS | Consultar con la anon key sin sesión y verificar que devuelve `[]` | A |
| Extractor de correos | Unitario contra correos reales anonimizados. La suite crece con cada formato nuevo | B |
| Función de scoring | `pgTAP` o tests SQL con pares conocidos. Casos frontera alrededor de cada umbral | C |
| Invariante 1:1 | Intentar confirmar dos conciliaciones para el mismo pago y verificar que Postgres lo rechaza | C |

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

---

« [Fases](07-fases.md) · [Pendientes →](09-pendientes.md)
