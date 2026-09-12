# OrganicoCR-Dashboard

Dashboard de conciliación de pagos para la tienda WooCommerce de OrganicoCR.

Cruza los pagos que llegan por correo del banco contra los pedidos de la tienda, y muestra quién debe y quién pagó. Hoy el estado de pago se lleva a mano y se pierden cobros: un pedido marcado como `processing` en la tienda no significa que la plata haya entrado.

Es un dashboard interno, con un solo usuario: el dueño.

## Stack

React 19 · TypeScript 6 · Vite 8 · Tailwind v4 · TanStack Query v5 · Supabase (Postgres + Edge Functions) · Vercel

Requiere Node 24, pnpm 10 y la CLI de Supabase. **pnpm siempre** — nunca `npm` ni `yarn`.

## Puesta en marcha

```bash
pnpm install
cp .env.example .env.local     # completar con los valores de abajo
supabase start                 # imprime la URL y las claves del stack local
pnpm usuario:dev               # crea el usuario del dashboard
pnpm dev
```

`.env.local` necesita las credenciales de solo lectura de WooCommerce, la URL y las claves del Supabase local, el secreto del webhook y el usuario de desarrollo. Cada variable está explicada en [`.env.example`](.env.example).

Todo lo que empieza con `VITE_` termina dentro del bundle que descarga el navegador: ahí solo van la URL de Supabase y la publishable key. La secret key nunca lleva ese prefijo. `.env.local` no se commitea.

Si Vite avisa `Port 5173 is in use`, salta de puerto — leer el real de la salida de `pnpm dev`.

## Comandos

| Comando | Qué hace |
|---|---|
| `pnpm dev` | Servidor de desarrollo |
| `pnpm typecheck` | `tsc -b` |
| `pnpm lint` | `oxlint src` |
| `pnpm test` | `vitest run` |
| `pnpm build` | Build de producción a `dist/` |
| `pnpm usuario:dev` | Repone el usuario del dashboard en el Supabase local. Idempotente |
| `pnpm backfill` | Trae los pedidos históricos desde la API de WooCommerce |

Un test suelto: `pnpm exec vitest run src/utils/format-colones.test.ts`

Base de datos:

```bash
supabase db reset    # recrea la base LOCAL. Borra auth.users -> correr pnpm usuario:dev después
supabase db push     # aplica las migraciones a la nube. Suma, no destruye
supabase functions serve woo-webhook --env-file supabase/functions/.env --no-verify-jwt
```

**Nunca `supabase db reset --linked`**: apunta a la nube y borra todo lo que haya ahí.

## Cómo funciona

Tres flujos independientes que convergen en Postgres. Ninguno necesita a los otros para funcionar: los pedidos entran aunque el correo falle, los pagos se registran aunque no haya pedido que les corresponda.

```
WooCommerce --webhook HMAC--> [woo-webhook] --> tabla pedidos ---+
                                                                 |
Gmail banco --pg_cron 5min--> [gmail-poll] --> tabla pagos --> [matcher SQL] --> conciliaciones
                                                                 |
React + TanStack Query <-- supabase-js + RLS <-------------------+
```

Tres reglas que explican casi todas las decisiones del diseño:

1. **WooCommerce nunca se escribe.** Entra por webhook y backfill; no sale nada hacia la tienda. Un bug nuestro no puede romper la tienda en producción.
2. **El estado de pago vive en nuestra base, no en WooCommerce.** Se siembra desde Woo una sola vez, al insertar, y ningún update posterior lo pisa.
3. **El LLM extrae datos del correo. El LLM no decide qué pago corresponde a qué pedido.** Eso es una función SQL determinista, testeable y re-ejecutable.

Los montos se guardan como enteros en céntimos, nunca como float: el matching compara por igualdad exacta.

## Estructura

```
src/
  features/<nombre>/{components,hooks,services,types}   # auth, pedidos
  components/ hooks/ lib/ utils/ constants/ types/      # transversal
supabase/
  functions/woo-webhook/                                # Edge Function (Deno)
  migrations/
scripts/                                                # backfill y usuario de desarrollo
docs/
```

Las capas van en una sola dirección: `components → hooks → services → utils`. Los componentes no hacen fetch, los hooks no tienen JSX, los services no tienen estado, los utils son puros. Los tests viven al lado del archivo que prueban.

Las convenciones completas —nombres, límites de tamaño, reglas de base de datos— están en [`docs/referencia/convenciones.md`](docs/referencia/convenciones.md). Leerlas antes de escribir cualquier archivo.

## Documentación

| Carpeta | Qué contiene | Cuándo leerla |
|---|---|---|
| [`docs/specs/`](docs/specs/README.md) | Qué construimos y por qué, con la justificación de cada decisión | Antes de cambiar el diseño |
| [`docs/plans/`](docs/plans/README.md) | Cómo construirlo, tarea por tarea. Cada tarea es autocontenida | Al implementar |
| [`docs/referencia/`](docs/referencia/convenciones.md) | Hechos verificados del entorno real, comportamiento de la tienda, convenciones | Cuando algo no cuadra |

[`docs/referencia/entorno.md`](docs/referencia/entorno.md) tiene las trampas ya verificadas de la máquina de desarrollo, de Supabase y de WooCommerce. Vale la pena leerlo antes de pelear con una.

## Estado

| Fase | Alcance | Estado |
|---|---|---|
| A | Pedidos de WooCommerce visibles en el dashboard | Desplegada |
| B | Agente que lee los correos del banco | Diseñada, sin planificar |
| C | Conciliación automática pago ↔ pedido | Diseñada, sin planificar |
| D | Secciones "Revisar" y "Pagaron" | Diseñada, sin planificar |

La Fase B está bloqueada hasta tener correos reales del banco: sin ellos no se puede escribir el extractor. Detalle en [`docs/specs/09-pendientes.md`](docs/specs/09-pendientes.md).

## Despliegue

El frontend va a Vercel como build estático de Vite (`vercel.json` ya tiene el rewrite a `index.html` para el enrutado del cliente). Las migraciones van con `supabase db push` y la Edge Function con `supabase functions deploy`.

`config.toml` gobierna solo el stack local: la configuración del proyecto en la nube —el registro público, entre otras— se cambia desde el dashboard de Supabase.
