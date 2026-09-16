# Arquitectura

Dashboard de conciliación de pagos de OrganicoCR: cruza los avisos de pago que manda el banco por correo contra los pedidos de la tienda WooCommerce, y muestra quién debe y quién pagó. Un solo usuario (el dueño), sin SSR, sin roles.

## Stack

| Capa | Qué |
|---|---|
| Frontend | React 19 · TypeScript 6 · Vite 8 · Tailwind v4 (`@tailwindcss/vite`) · TanStack Query v5 |
| Datos | Supabase: Postgres 17 + RLS + `pg_cron` + `pg_net` + Vault + `pg_trgm` |
| Backend | Edge Functions en Deno: `woo-webhook`, `correo-poll`, `enviar-push` |
| Build/deploy | `vercel.json` (build estático, rewrite a `index.html`) |
| Tooling | pnpm · `oxlint` · `vitest` · Supabase CLI |

Alias `@/*` → `src/*` (solo con `paths`; sin `baseUrl`, deprecado en TS 6).

## Flujo de datos

Tres flujos independientes que convergen en Postgres. Ninguno necesita a los otros:

```
WooCommerce --webhook HMAC--> [woo-webhook] --> upsert_pedido --> pedidos ------+
                                                                                |
info@ (IMAP) --pg_cron 5min--> [correo-poll] --> correos_banco --> pagos --> [matcher SQL] --> conciliaciones
                                                     |                          |
                              pagos --trigger--> [enviar-push] --Web Push--> teléfono del dueño
                                                                                |
React + TanStack Query <-- supabase-js + RLS <----------------------------------+
```

1. **Pedidos.** `woo-webhook` guarda el payload crudo en `webhook_eventos` **antes** de procesarlo (incluso con firma inválida) y luego llama a la función SQL `upsert_pedido(jsonb)`. `scripts/backfill-woo.ts` trae el histórico por la REST de Woo. WooCommerce es solo lectura: nada sale hacia la tienda.
2. **Pagos.** `pg_cron` (`correo-poll-5min`) → `disparar_correo_poll()` → Vault (`service_role_key`) → `net.http_post` → `correo-poll`, que abre IMAP sobre TLS en modo `EXAMINE`, baja hasta `LOTE_MAXIMO = 50` mensajes por corrida, los guarda en `correos_banco` y extrae los pagos con los extractores de `_extractor/` (Davibank y BAC, por dirección del remitente).
3. **Conciliación.** Triggers sobre `pagos` y `pedidos` llaman a `conciliar_pago(uuid)`, que puntúa con `candidatos_de_pago(uuid)` y escribe en `conciliaciones`. Pesos y umbrales viven en la tabla `config` (`umbral_auto 0.85`, `umbral_revisar 0.55`, `ventana_dias 7`, `peso_monto 0.45`, `peso_nombre 0.25`, `peso_tiempo 0.10`, `peso_referencia 0.20`, `margen_desempate 0.05`).
4. **Aviso.** Trigger `pagos_avisan` (AFTER INSERT en `pagos`) → `pg_net` → `enviar-push` → Web Push cifrado (`aes128gcm`, firmado con VAPID).

## Mapa de carpetas

```
src/
  App.tsx                  # switch de secciones por estado, sin router
  components/              # transversal: app-header, navegacion-principal, logo-organico
  constants/               # estados-pago, secciones, rangos-fecha, metodos-extraccion
  lib/                     # supabase, query-client, registrar-service-worker
  types/                   # database.types.ts (generado por la CLI), env.d.ts
  utils/                   # puros: format-colones, fecha-cr, a-csv, rango-fechas, ...
  features/<nombre>/{components,hooks,services,types}
      auth · pedidos · pagos · conciliaciones · notificaciones
public/
  sw.js · sw-cache.js · sw-push.js   # fuera del bundle, a propósito
  manifest.webmanifest · icons/
supabase/
  functions/{woo-webhook,correo-poll,enviar-push,_extractor}/
  migrations/              # 14 migraciones, 20260911 → 20260915
  tests/matcher.sql
scripts/                   # backfill-woo, crear-usuario-dev, generar-vapid, generar-iconos, probar-imap, sembrar-greenmail
docs/{specs,plans,referencia,contexto}/
```

Dependencias en una sola dirección: `components → hooks → services → utils`, y `components → types/constants`.

## Lo que NO existe

- **No hay router.** Cuatro secciones (`Deben`, `Revisar`, `Pagaron`, `Pagos`) se conmutan con `useState` en `App.tsx`. `seccionInicial()` lee `?seccion=` **una sola vez al arrancar** (para el atajo del icono instalado y el clic en la notificación) y nunca vuelve a tocar la URL.
- **No hay SSR ni backend propio**: build estático de Vite + Edge Functions.
- **No hay `src/hooks/` transversal** (el README lo menciona, pero el directorio no existe: todos los hooks viven dentro de su feature).
- **No hay roles ni multi-tenant**: un solo usuario, y el registro público está cerrado.
- **No hay escritura hacia WooCommerce** ni credenciales que lo permitan.
- **No hay LLM en producción todavía**: los extractores son regex; `metodo_extraccion` admite `'llm'` pero nada lo emite hoy.
- **No hay librería de estado global** (Zustand/Redux): TanStack Query y `useState`.
- **No hay tests de componentes ni E2E**: solo unitarios de utils/services y SQL (`supabase/tests/matcher.sql`).
- **El frontend no está desplegado.** El backend corre solo en la nube; el dashboard se mira en `pnpm dev` / `pnpm preview`. Sin HTTPS no hay PWA instalable.
