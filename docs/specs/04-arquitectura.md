« [Spec](README.md)

# 4. Arquitectura

```
┌─ WooCommerce ──webhook HMAC──▶ [woo-webhook] ──▶ tabla pedidos ─┐
│  (nunca se escribe)                                             │
│                                                                 ▼
│  info@ ──pg_cron 5min──▶ [correo-poll] ──▶ correos_banco ──▶ tabla pagos ──▶ [matcher SQL]
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
| Secretos | Secretos de función + Vault | Credencial IMAP y API key del LLM nunca llegan al bundle. Vault solo para lo que necesita SQL: la key con que `pg_cron` invoca la función. |
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

### `correo-poll` — Edge Function, invocada por `pg_cron` cada 5 minutos

1. Abre IMAP sobre TLS contra `mail.organicocr.store:993` y hace login con la credencial de `info@`.
2. **`EXAMINE`, no `SELECT`**: el buzón queda en solo lectura a nivel de protocolo, así que el servidor rechaza marcar leído o borrar. Es el buzón del negocio y no se toca.
3. `UID SEARCH FROM <remitente>` por cada entrada de `config.remitentes_banco`, desde el cursor guardado. Nada que no venga de un banco se descarga.
4. Guarda el crudo en `correos_banco` con el header `Message-ID` como clave de idempotencia, y después intenta extraer.

El cursor (`uidvalidity` + último UID) vive en `config` y solo evita re-descargar lo ya visto. Perderlo cuesta ancho de banda, no datos: la idempotencia la garantiza el `unique` sobre `mensaje_id`.

**Se captura antes de extraer, en dos pasos.** Un correo que el parser no entiende queda guardado igual, con `procesado_ok = false`, y se re-procesa cuando el extractor mejore. Mismo criterio que `webhook_eventos`.

### Extractor — módulo compartido, no Edge Function aparte

1. **Regex primero.** Las notificaciones del banco son plantillas fijas. Acierta la gran mayoría, cuesta ₡0, es determinista.
2. **LLM de respaldo** (Claude Haiku, salida estructurada) solo cuando el regex falla.
3. Cada fila guarda `metodo_extraccion` (`regex` | `llm`) y el cuerpo completo del correo.

**Por qué el respaldo importa:** si el banco cambia la plantilla, un sistema de solo regex se rompe en silencio y el dueño deja de ver pagos sin enterarse. El fallback absorbe el cambio, y un salto en la proporción de `llm` es la señal de alerta.

### `matcher` — función `plpgsql`

Disparada por trigger tras insert en `pagos` y tras insert/update en `pedidos`. Ver [algoritmo](05-datos.md).

---

« [Principios](03-principios.md) · [Modelo de datos →](05-datos.md)
