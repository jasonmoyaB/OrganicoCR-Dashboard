« [Spec](README.md)

# 4. Arquitectura

```
┌─ WooCommerce ──webhook HMAC──▶ [woo-webhook] ──▶ tabla pedidos ─┐
│  (nunca se escribe)                                             │
│                                                                 ▼
│  Gmail banco ──pg_cron 5min──▶ [gmail-poll] ──▶ tabla pagos ──▶ [matcher SQL]
│                                    │                                 │
│                              regex → LLM fallback                    ▼
│                                                              tabla conciliaciones
│                                                                      │
└──────────────────── React + TS (Vite) ◀── supabase-js + RLS ─────────┘
```

Tres flujos independientes que convergen en Postgres. Ninguno depende del otro para funcionar: los pedidos entran aunque el correo falle, los pagos se registran aunque no haya pedido que les corresponda.

## Stack

| Capa | Elección | Justificación |
|---|---|---|
| Frontend | React 19 + TypeScript 6 + **Vite 8** | Dashboard interno tras login. Sin SEO, sin SSR. Next.js sería peso muerto. Build estático. |
| UI | Tailwind v4 + shadcn/ui | Tablas, badges y diálogos listos. El valor del proyecto está en el matching, no en componentes a mano. |
| Estado servidor | TanStack Query v5 + supabase-js | Cache, refetch, invalidación. Realtime opcional en Fase D. |
| Base de datos | Supabase Postgres + `pg_trgm` | Similitud de nombres en SQL, junto a los datos — no en JavaScript. |
| Backend | Supabase Edge Functions (Deno) | [R3](02-restricciones.md). |
| Scheduler | `pg_cron` | Sin infraestructura adicional. |
| Secretos | Supabase Vault | Refresh token de Gmail y API key del LLM nunca llegan al bundle del navegador. |
| Hosting front | Vercel (estático) | Build de Vite, deploy por git push. |

## Componentes backend

### `woo-webhook` — Edge Function, endpoint público HTTPS

1. Verifica `X-WC-Webhook-Signature` (HMAC-SHA256 del **cuerpo crudo** con el secreto compartido). Firma inválida → 401, y el intento queda registrado.
2. Escribe el payload crudo en `webhook_eventos`.
3. Llama a `upsert_pedido`.
4. Responde 200 rápido. Cualquier trabajo pesado va después del ack.

Topics suscritos: `order.created`, `order.updated`.

### Backfill inicial — script de una sola ejecución

Trae los pedidos históricos vía WooCommerce REST API con una consumer key de solo lectura. Sin esto, el dashboard arranca vacío el día del demo.

### `gmail-poll` — Edge Function, invocada por `pg_cron` cada 5 minutos

1. Refresca el access token desde el refresh token guardado en Vault.
2. `users.messages.list` filtrando por remitente del banco, con `historyId` incremental para no re-leer el buzón completo.
3. Para cada mensaje nuevo: extrae e inserta en `pagos` con `gmail_message_id` como clave de idempotencia.

### Extractor — módulo compartido, no Edge Function aparte

1. **Regex primero.** Las notificaciones del banco son plantillas fijas. Acierta la gran mayoría, cuesta ₡0, es determinista.
2. **LLM de respaldo** (Claude Haiku, salida estructurada) solo cuando el regex falla.
3. Cada fila guarda `metodo_extraccion` (`regex` | `llm`) y el cuerpo completo del correo.

**Por qué el respaldo importa:** si el banco cambia la plantilla, un sistema de solo regex se rompe en silencio y el dueño deja de ver pagos sin enterarse. El fallback absorbe el cambio, y un salto en la proporción de `llm` es la señal de alerta.

### `matcher` — función `plpgsql`

Disparada por trigger tras insert en `pagos` y tras insert/update en `pedidos`. Ver [algoritmo](05-datos.md).

---

« [Principios](03-principios.md) · [Modelo de datos →](05-datos.md)
