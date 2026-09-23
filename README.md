# OrganicoCR-Dashboard

Dashboard de conciliación de pagos para la tienda WooCommerce de OrganicoCR.

Cruza los pagos que llegan por correo del banco contra los pedidos de la tienda, y muestra quién debe y quién pagó. Hoy el estado de pago se lleva a mano y se pierden cobros: un pedido marcado como `processing` en la tienda no significa que la plata haya entrado.

Es un dashboard interno, con un solo usuario: el dueño. Se instala como app en el teléfono y avisa cuando entra un pago.

## Stack

React 19 · TypeScript 6 · Vite 8 · Tailwind v4 · TanStack Query v5 · Supabase (Postgres + Edge Functions en Deno + `pg_cron` + `pg_net` + Vault) · Vercel

Requiere Node 24, pnpm 10 y la CLI de Supabase. **pnpm siempre** — nunca `npm` ni `yarn`.

## Puesta en marcha

```bash
pnpm install
cp .env.example .env.local     # completar con los valores de abajo
supabase start                 # imprime la URL y las claves del stack local
pnpm usuario:dev               # crea el usuario del dashboard
pnpm dev
```

`.env.local` necesita las credenciales de solo lectura de WooCommerce, la URL y las claves del Supabase local, el secreto del webhook, el usuario de desarrollo y la llave VAPID pública. Cada variable está explicada en [`.env.example`](.env.example). Los secretos de las Edge Functions —credencial IMAP y llaves VAPID— van aparte, en `supabase/functions/.env`.

Todo lo que empieza con `VITE_` termina dentro del bundle que descarga el navegador: ahí solo van la URL de Supabase, la publishable key y la mitad pública de VAPID. La secret key nunca lleva ese prefijo. `.env.local` no se commitea.

Si Vite avisa `Port 5173 is in use`, salta de puerto — leer el real de la salida de `pnpm dev`.

## Comandos

| Comando | Qué hace |
|---|---|
| `pnpm dev` | Servidor de desarrollo |
| `pnpm typecheck` | `tsc -b` |
| `pnpm lint` | `oxlint src` |
| `pnpm test` | `vitest run` |
| `pnpm test:sql` | Pruebas del matcher contra el Postgres local |
| `pnpm build` | Build de producción a `dist/` |
| `pnpm preview` | Sirve el build. **Única forma de probar el PWA en local** |
| `pnpm usuario:dev` | Repone el usuario del dashboard en el Supabase local. Idempotente |
| `pnpm backfill` | Trae los pedidos históricos desde la API de WooCommerce |
| `pnpm imap:probar` | Verifica la credencial del buzón |

Un test suelto: `pnpm exec vitest run src/utils/format-colones.test.ts`

Base de datos:

```bash
supabase db reset    # recrea la base LOCAL. Borra auth.users -> correr pnpm usuario:dev después
supabase db push     # aplica las migraciones a la nube. Suma, no destruye
supabase gen types typescript --local > src/types/database.types.ts
supabase functions serve woo-webhook --env-file supabase/functions/.env --no-verify-jwt
```

PWA y notificaciones, una sola vez y no en cada build:

```bash
node scripts/generar-vapid.mjs                                        # par de llaves VAPID
powershell -ExecutionPolicy Bypass -File scripts/generar-iconos.ps1    # iconos desde el logo
```

**Nunca `supabase db reset --linked`**: apunta a la nube y borra todo lo que haya ahí.

## Cómo funciona

Tres flujos independientes que convergen en Postgres. Ninguno necesita a los otros para funcionar: los pedidos entran aunque el correo falle, los pagos se registran aunque no haya pedido que les corresponda.

```
WooCommerce --webhook HMAC--> [woo-webhook] --> upsert_pedido --> pedidos ------+
                                                                                |
info@ (IMAP) --pg_cron 5min--> [correo-poll] --> correos_banco --> pagos --> [matcher SQL] --> conciliaciones
                                                                                |
pagos --trigger--> [enviar-push] --Web Push cifrado--> el teléfono del dueño    |
                                                                                |
React + TanStack Query <-- supabase-js + RLS <----------------------------------+
```

El correo del banco **no está en Gmail**: `info@organicocr.store` es un Dovecot de cPanel que se lee por IMAP en solo lectura (`EXAMINE`). Los avisos llegan de `servicioalcliente@davibank.cr` y `notificaciones@baccredomatic.cr`.

Tres reglas que explican casi todas las decisiones del diseño:

1. **WooCommerce nunca se escribe.** Entra por webhook y backfill; no sale nada hacia la tienda. Un bug nuestro no puede romper la tienda en producción.
2. **El estado de pago vive en nuestra base, no en WooCommerce.** Se siembra desde Woo una sola vez, al insertar, y ningún update posterior lo pisa.
3. **El LLM extrae datos del correo. El LLM no decide qué pago corresponde a qué pedido.** Eso es una función SQL determinista, testeable y re-ejecutable.

Los montos se guardan como enteros en céntimos, nunca como float: el matching compara por igualdad exacta.

## Estructura

```
src/
  features/<nombre>/{components,hooks,services,types}   # auth, pedidos, pagos, conciliaciones, notificaciones
  components/ lib/ utils/ constants/ types/             # transversal
public/
  sw.js sw-cache.js sw-push.js   # service worker, fuera del bundle a propósito
  manifest.webmanifest icons/
supabase/
  functions/{woo-webhook,correo-poll,enviar-push,_extractor}/
  migrations/  tests/
scripts/                                                # backfill, usuario dev, VAPID, iconos
docs/
```

Las capas van en una sola dirección: `components → hooks → services → utils`. Los componentes no hacen fetch, los hooks no tienen JSX, los services no tienen estado, los utils son puros. Los tests viven al lado del archivo que prueban.

Dos excepciones, las dos deliberadas: los `sw*.js` de `/public` quedan fuera del bundle —el navegador identifica al worker por su URL— y las Edge Functions no importan de `src/`, porque el bundler del deploy no sigue imports fuera de `supabase/functions/`.

Las convenciones completas —nombres, límites de tamaño, reglas de base de datos— están en [`docs/referencia/convenciones.md`](docs/referencia/convenciones.md). Leerlas antes de escribir cualquier archivo.

## Documentación

| Carpeta | Qué contiene | Cuándo leerla |
|---|---|---|
| [`docs/contexto/`](docs/contexto/arquitectura.md) | Resumen del proyecto entero: arquitectura, convenciones, decisiones, glosario, flujo de trabajo y errores conocidos | Para agarrar contexto rápido |
| [`docs/specs/`](docs/specs/README.md) | Qué construimos y por qué, con la justificación de cada decisión | Antes de cambiar el diseño |
| [`docs/plans/`](docs/plans/README.md) | Cómo construirlo, tarea por tarea. Cada tarea es autocontenida | Al implementar |
| [`docs/referencia/`](docs/referencia/convenciones.md) | Hechos verificados del entorno real, comportamiento de la tienda, convenciones | Cuando algo no cuadra |

[`docs/referencia/entorno.md`](docs/referencia/entorno.md) tiene las trampas ya verificadas de la máquina de desarrollo, de Supabase y de WooCommerce. Vale la pena leerlo antes de pelear con una.

## Estado

| Fase | Alcance | Estado |
|---|---|---|
| A | Pedidos de WooCommerce visibles en el dashboard | Desplegada |
| B | Lectura de los correos del banco por IMAP | Desplegada |
| C | Conciliación automática pago ↔ pedido | Desplegada |
| D | Secciones "Revisar" y "Pagaron" | Desplegada |
| E | App instalable y avisos de pago | Implementada, sin desplegar |

El backend corre solo desde el 2026-09-14: `pg_cron` cada 5 minutos → Vault → `net.http_post` → `correo-poll` → IMAP sobre TLS → `correos_banco` → `pagos` → matcher → `conciliaciones`.

**Lo que falta es el frontend.** Sin él desplegado no hay PWA instalable ni notificaciones: un service worker se instala solo sobre HTTPS o localhost. Hoy el dashboard se mira en `pnpm dev`, y el PWA se prueba con `pnpm build && pnpm preview`. Detalle en [`docs/specs/09-pendientes.md`](docs/specs/09-pendientes.md).

## Despliegue

El frontend va a Vercel como build estático de Vite (`vercel.json` ya tiene el rewrite a `index.html` y el `Content-Type` del manifest). Hace falta cargar `VITE_VAPID_PUBLIC_KEY` en las variables de entorno de Vercel: sin ella la franja para activar notificaciones no aparece, a propósito.

Las migraciones van con `supabase db push` y las Edge Functions con `supabase functions deploy`. Después, dos cosas que ningún comando hace: los secretos (`supabase secrets set`) y apuntar las URLs de `config` al dominio del proyecto —la migración las deja apuntando a la red de Docker—.

`config.toml` gobierna solo el stack local: la configuración del proyecto en la nube —el registro público, entre otras— se cambia desde el dashboard de Supabase. **No usar `supabase config push`**: empuja `site_url = http://127.0.0.1:5173` y rompe los enlaces de los correos en producción.
