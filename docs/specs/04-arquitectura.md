« [Spec](README.md)

# 4. Arquitectura

```
┌─ WooCommerce ──webhook HMAC──▶ [woo-webhook] ──▶ tabla pedidos ─┐
│  (nunca se escribe)                                             │
│                                                                 ▼
│  info@ ──pg_cron 5min──▶ [correo-poll] ──▶ correos_banco ──▶ tabla pagos ──▶ [matcher SQL]
│                                    │                            │    │
│                              regex → LLM fallback               │    ▼
│                                                                 │  tabla conciliaciones
│                                                     trigger ────┤    │
│                                                                 ▼    │
│                                   [enviar-push] ──Web Push cifrado──▶ teléfono del dueño
│                                                                      │
└──────────────────── React + TS (Vite, PWA) ◀── supabase-js + RLS ────┘
```

Tres flujos independientes que convergen en Postgres. Ninguno depende del otro para funcionar: los pedidos entran aunque el correo falle, los pagos se registran aunque no haya pedido que les corresponda.

## Stack

| Capa | Elección | Justificación |
|---|---|---|
| Frontend | React 19 + TypeScript 6 + **Vite 8** | Dashboard interno tras login. Sin SEO, sin SSR. Next.js sería peso muerto. Build estático. |
| UI | Tailwind v4 **a secas** | El spec original decía shadcn/ui. No se instaló y no hizo falta: el dashboard son cuatro tablas y dos botones, y shadcn habría traído Radix entero para eso. |
| Estado servidor | TanStack Query v5 + supabase-js | Cache, refetch, invalidación. Realtime nunca hizo falta: los avisos de pago llegan por Web Push, que funciona con la app cerrada. |
| Base de datos | Supabase Postgres + `pg_trgm` | Similitud de nombres en SQL, junto a los datos — no en JavaScript. |
| Backend | Supabase Edge Functions (Deno) | [R3](02-restricciones.md). |
| Scheduler | `pg_cron` | Sin infraestructura adicional. |
| Secretos | Secretos de función + Vault | Credencial IMAP, API key del LLM y llave privada VAPID nunca llegan al bundle. Vault solo para lo que necesita SQL: la key con que `pg_cron` y el trigger de `pagos` invocan funciones. |
| Hosting front | Vercel (estático) | Build de Vite, deploy por git push. **Todavía no desplegado.** |
| App instalable | Service worker a mano, sin `vite-plugin-pwa` | Manifest + tres `sw*.js` en `/public`. Un plugin habría traído Workbox entero para cachear siete archivos. |

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

### `enviar-push` — Edge Function, invocada por trigger desde `pagos`

1. El trigger `pagos_avisan` sale con `net.http_post`, misma tubería que el cron: URL en `config.enviar_push_url`, credencial en Vault.
2. La función lee el pago con su propia credencial —el trigger manda solo el `pago_id`, no los datos del tercero— y arma el texto del aviso.
3. Cifra el payload con la llave del navegador (RFC 8291) y lo firma con las VAPID (RFC 8292). El servicio de push mueve el mensaje sin poder leerlo.
4. Una suscripción que devuelve 404 o 410 se borra de la tabla.

**El trigger nunca levanta una excepción.** Cuelga de un `INSERT` en `pagos`: un `raise exception` —por un secreto faltante, por ejemplo— impediría guardar el pago. Todo es `raise warning`, y el `net.http_post` va dentro de un bloque `exception when others`. Quedarse sin aviso es molesto; perder el registro de plata que entró es el peor bug del sistema.

### Service worker — tres archivos en `/public`

`sw.js` es la entrada y no hace nada más que `importScripts` de `sw-cache.js` y `sw-push.js`. El navegador exige un solo archivo registrado; esta es la única forma de que caché y notificaciones no compartan archivo.

**Van en `/public` y no en `/src`:** el navegador identifica al worker por su URL, así que un nombre con hash haría que cada deploy instalara un worker nuevo en vez de actualizar el que está. El precio es que `oxlint` y `tsc` no los miran.

**Nada de Supabase se cachea.** Solo el cascarón y los `/assets/*` con hash. Un dashboard que dice quién debe plata no puede servir una respuesta vieja de la API como si fuera de ahora.

---

« [Principios](03-principios.md) · [Modelo de datos →](05-datos.md)
