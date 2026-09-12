« [Índice](../README.md)

# Errores conocidos

Buscar acá por el **mensaje exacto** antes de depurar. Todo lo de esta página ya pasó en este proyecto y ya tiene causa identificada. El detalle largo vive en [`entorno.md`](entorno.md) y [`tienda-woocommerce.md`](tienda-woocommerce.md); acá está la ruta corta.

## TypeScript y build

| Síntoma | Causa | Fix |
|---|---|---|
| `error TS5101: Option 'baseUrl' is deprecated and will stop functioning in TypeScript 7.0` | TS 6 deprecó `baseUrl`. No hace falta: desde TS 5.4 `paths` se resuelve relativo al `tsconfig.json` que lo declara | Borrar `baseUrl`. El alias `@/*` funciona solo con `paths` |
| `tsc -b` falla por configuración al pasarle `--noEmit` | `-b` no acepta esa bandera, y los `tsconfig` ya declaran `noEmit: true` | `tsc -b` a secas — es lo que hace `pnpm typecheck` |

## Tests

| Síntoma | Causa | Fix |
|---|---|---|
| Un test de formato falla y los dos strings **se ven idénticos** | `Intl.NumberFormat("es-CR")` separa los miles con **U+00A0**, no con espacio normal | Usar ` ` en el esperado. Ver [`entorno.md`](entorno.md) |
| `pnpm test` corre más archivos de los que existen en `src/` | `.claude/worktrees/` contiene worktrees de **otro repositorio** con sus propios tests | Ya acotado: `test.include` explícito en `vite.config.ts`. Si reaparece, revisar esa lista |
| `pnpm lint` marca archivos ajenos | Mismo origen. `ignorePatterns` de `.oxlintrc.json` **no** surte efecto sobre esos directorios | El script pasa el directorio por CLI: `oxlint src` |

## Supabase — auth y permisos

| Síntoma | Causa | Fix |
|---|---|---|
| El login devuelve `invalid_credentials` y nadie tocó el código | `supabase db reset` recrea la base entera, esquema `auth` incluido: el usuario del dashboard desapareció | `pnpm usuario:dev` |
| `{"code":422,"error_code":"email_provider_disabled","msg":"Email logins are disabled"}` | Se puso `enable_signup = false` bajo `[auth.email]`, que apaga el proveedor de email **entero, login incluido** | El que cierra el registro es el de `[auth]`. `[auth.email].enable_signup` se deja en `true` |
| `POST /auth/v1/signup` devuelve `email_address_invalid` | Se probó con `@example.com`, que Supabase rechaza **antes** de mirar si el registro está abierto | Probar con una dirección inexistente de un dominio real. Da un falso "cerrado" si no |
| `new row violates row-level security policy` al invocar una función | La función **sí se ejecutó** — el `revoke execute` no tomó efecto. Postgres otorga `EXECUTE` a `PUBLIC`, y `anon`/`authenticated` heredan de ahí | Falta `revoke execute on function ... from public;` |
| `permission denied for function upsert_pedido` | El revoke funciona. No es un bug | — |
| `permission denied for table pedidos` (`42501`) en un `PATCH` | `authenticated` tiene privilegio de columna solo sobre `estado_pago` — cualquier otra columna se rechaza a nivel de tabla, antes de RLS | Es el comportamiento correcto (`20260911205500_endurecer_update_pedidos.sql`) |

## Supabase — Edge Functions

| Síntoma | Causa | Fix |
|---|---|---|
| `{"code":"WORKER_ERROR","message":"Function exited due to an error"}` con 500 | Genérico: el motivo real **solo** aparece en el log de `functions serve` | Mirar el log antes de suponer |
| `runtime has escaped from the event loop unexpectedly: ... Falta la variable de entorno SUPABASE_SECRET_KEY` | El prefijo `SUPABASE_` está reservado: ese secret no se puede definir y la función no lo ve | Usar `SUPABASE_SERVICE_ROLE_KEY`, que el runtime inyecta solo |
| `{"msg":"Error: Missing authorization header"}` | El gateway exige JWT y responde **antes** de que la función corra. WooCommerce no manda ese header | `verify_jwt = false` en `config.toml` **y** `--no-verify-jwt` al servir en local: `serve` no lee `config.toml` |
| `Function not found`, sin más explicación | La CLI trata `supabase/functions/_loquesea` como código compartido, no como función | Renombrar sin el `_` inicial |
| En local, `SUPABASE_URL` dentro de la función es `http://kong:8000` | Es la URL interna del contenedor, no `127.0.0.1`. No es un error | — |

## WooCommerce

| Síntoma | Causa | Fix |
|---|---|---|
| `woocommerce_rest_cannot_view` con `401` y credenciales correctas | El hosting (Bluehost) descarta el header `Authorization` antes de WordPress | Autenticar por query string: `?consumer_key=...&consumer_secret=...` |
| `woocommerce_rest_cannot_view` con `403` | El usuario dueño de la key no es admin ni Shop manager | Regenerar la key con un usuario que lo sea |
| `woocommerce_rest_authentication_error` | Secret incorrecto, o falta el par `ck:cs` | — |
| `rest_no_route` | Permalinks en "Simple" | Cambiar a "Nombre de la entrada" |
| Al activar el webhook: `Error: La URL de entrega devolvió un código de respuesta: 401` | El ping de activación no trae firma HMAC y el cuerpo es `webhook_id=N` form-encoded, así que la verificación lo rechaza | Ya cubierto por `es-ping.ts`, que responde 200 antes de verificar. Es el **único** cuerpo que se contesta sin HMAC |
| Faltan pedidos en el backfill, sin error | Sin `status=any` WooCommerce omite estados de la respuesta, en silencio | `?per_page=100&status=any&orderby=date&order=asc` |
| Los pedidos aparecen desplazados 6 horas | `date_created_gmt` viene **sin `Z`** (`"2026-09-07T17:34:26"`) y `new Date()` lo interpreta en la zona local | Concatenar la `Z`: `new Date(orden.date_created_gmt + "Z")` |
| Los totales llegan como `"1965"` y no `"1965.00"` | La tienda usa CRC sin decimales. No es un error | El parser de montos ya cubre ambos formatos |

## Frontend

| Síntoma | Causa | Fix |
|---|---|---|
| Un borde se ve casi negro, sin error ni advertencia | Tailwind v4 resetea `border: 0 solid` **sin color**, así que hereda `currentColor`. En v3 el default era `gray-200` | Todo borde lleva su color: `border border-neutral-200` |
| El login o los redirects no funcionan en el puerto esperado | Vite salta de puerto si el 5173 está ocupado (`Port 5173 is in use, trying another one...`), pero `config.toml` apunta al 5173 | Leer el puerto real de la salida de `pnpm dev`. No afecta a `signInWithPassword`, que no redirige |

## Git y entorno

| Síntoma | Causa | Fix |
|---|---|---|
| `warning: LF will be replaced by CRLF` en cada archivo | `core.autocrlf` en Windows. No es un problema | — |
| El `README.md` de la raíz apareció sobrescrito con el de Vite | El scaffold (`cp -r .tmp-scaffold/* .`) lo pisa | `git restore README.md` |

## Lo que no hay que hacer nunca

Tres comandos que destruyen datos reales. No tienen mensaje de error: funcionan, y ese es el problema.

- **`supabase db reset --linked`** — `db reset` a secas recrea la base local, que es inofensivo. Con `--linked` apunta a la nube y borra todo lo que haya ahí. A la nube solo se le hace `db push`.
- **`supabase config push`** — empuja toda la config local, `site_url = http://127.0.0.1:5173` incluido, y rompe los enlaces de los correos en producción. La config de la nube se cambia desde el dashboard.
- **Activar las credenciales de producción comentadas en `.env.local`** — hace que `pnpm backfill` y `pnpm usuario:dev` escriban en la base real. `crear-usuario-dev.mjs` aborta solo si la URL no es `127.0.0.1`, pero el backfill no tiene esa red.

Y una regla sin comando: **una migración ya aplicada no se edita**. Lo que haya que corregir va en una migración nueva.

---

« [Índice](../README.md) · [Entorno](entorno.md) · [Tienda WooCommerce](tienda-woocommerce.md) · [Convenciones](convenciones.md)
