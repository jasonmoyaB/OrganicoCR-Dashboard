« [Índice](../README.md)

# Errores conocidos

Buscar acá por el **mensaje exacto** antes de depurar. Todo lo de esta página ya pasó en este proyecto y ya tiene causa identificada. El detalle largo vive en [`entorno.md`](entorno.md) y [`tienda-woocommerce.md`](tienda-woocommerce.md); acá está la ruta corta.

## TypeScript y build

| Síntoma | Causa | Fix |
|---|---|---|
| `error TS5101: Option 'baseUrl' is deprecated and will stop functioning in TypeScript 7.0` | TS 6 deprecó `baseUrl`. No hace falta: desde TS 5.4 `paths` se resuelve relativo al `tsconfig.json` que lo declara | Borrar `baseUrl`. El alias `@/*` funciona solo con `paths` |
| `tsc -b` falla por configuración al pasarle `--noEmit` | `-b` no acepta esa bandera, y los `tsconfig` ya declaran `noEmit: true` | `tsc -b` a secas — es lo que hace `pnpm typecheck` |
| `error TS2322: Type 'Uint8Array<ArrayBufferLike>' is not assignable to type 'string \| BufferSource \| null \| undefined'` … `Type 'SharedArrayBuffer' is not assignable to type 'ArrayBuffer'` | Desde TS 5.7 los arreglos tipados son genéricos y el default incluye `SharedArrayBuffer`, que `applicationServerKey` no acepta. `Uint8Array.from(...)` infiere el genérico ancho | Declarar `Uint8Array<ArrayBuffer>` y construir por largo (`new Uint8Array(n)` + loop), que es lo que fija el genérico. Ver `src/utils/base64url-a-bytes.ts` |

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
| `Falta la variable de entorno VAPID_CONTACTO` **y la variable está en el `.env`** | `supabase/functions/.env` no termina en salto de línea, así que un `cat >> ` pega la clave nueva al final de la anterior: `CORREO_IMAP_CLAVE=xxxVAPID_CONTACTO=...` | Al anexar, meter un `echo` vacío antes: `{ cat .env; echo; nuevas; } > destino`. Se ve al instante con `tail -3 archivo \| cat -A` |
| `enviar-push` devuelve `401 {"error":"Solo la base dispara avisos"}` **al trigger de la propia base** | Primera versión comparaba el bearer contra `SUPABASE_SERVICE_ROLE_KEY`. En la nube ese valor **no** es el mismo string que el trigger saca de Vault: depende del esquema de claves del proyecto, que cambió con publishable/secret. En local coincidían —las dos son la misma llave de demo— así que no se veía | Ya corregido: la función decodifica el bearer y exige `role = service_role`. Si aparece igual, el que llamó no es `service_role` (p. ej. la publishable key), y entonces el 401 es correcto |

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
| En `pnpm dev` no hay service worker, no aparece "Instalar" y la franja de notificaciones nunca se muestra | Por diseño: `registrarServiceWorker()` sale temprano si no es `import.meta.env.PROD`. Un worker que cachea en dev deja al navegador mostrando código viejo | `pnpm build && pnpm preview`. localhost cuenta como contexto seguro: instalación y push funcionan igual que en Vercel |
| La franja "Activar notificaciones" no aparece ni en el build de producción | Falta `VITE_VAPID_PUBLIC_KEY`. `puedeRecibirPush()` la exige, a propósito: pedirle permiso a alguien para algo que no va a funcionar es peor que no pedírselo | `node scripts/generar-vapid.mjs` y pegar la línea en `.env.local` (y en las env de Vercel) |

## PWA — probar con un navegador de verdad

| Síntoma | Causa | Fix |
|---|---|---|
| `Failed to execute 'open' on 'CacheStorage': Unexpected internal error.` y `getRegistrations()` devuelve `[]`, **aunque `register()` resuelve OK con su scope** | El `--user-data-dir` está en una ruta larga. Chrome cuelga bajo ella `Default/Service Worker/CacheStorage/<hash>/...` y se pasa del `MAX_PATH` de Windows; el almacenamiento falla sin decir por qué | Perfil en ruta corta: `--user-data-dir=C:/Users/<vos>/AppData/Local/Temp/pp`. **No** usar el scratchpad de la sesión, que ya es larguísimo |
| Lo mismo, con el perfil en ruta corta | `--headless` no da CacheStorage ni service workers fiables | Chrome con ventana. Se puede seguir manejando por CDP en `--remote-debugging-port` |
| `curl http://127.0.0.1:4173/...` devuelve `HTTP 000` y exit 7, pero `vite preview` dice que está escuchando | `preview` anuncia `localhost` y bindea IPv6 (`::1`). `127.0.0.1` no es la misma interfaz | Pegarle a `http://localhost:4173`, o `vite preview --host 127.0.0.1` |

## Git y entorno

| Síntoma | Causa | Fix |
|---|---|---|
| `warning: LF will be replaced by CRLF` en cada archivo | `core.autocrlf` en Windows. No es un problema | — |
| El `README.md` de la raíz apareció sobrescrito con el de Vite | El scaffold (`cp -r .tmp-scaffold/* .`) lo pisa | `git restore README.md` |
| react-doctor marca `repository-secret-file` sobre un `.env.local.bak-local` | El patrón `*.local` **no** lo agarra: el archivo termina en `-local`, no en `.local`. Estaba sin rastrear pero sin ignorar, así que un `git add -A` lo habría commiteado con credenciales reales | Ya cubierto: `.gitignore` usa `.env` + `.env.*` + `!.env.example`. Comprobar con `git check-ignore -v <archivo>` |

## Lo que no hay que hacer nunca

Tres comandos que destruyen datos reales. No tienen mensaje de error: funcionan, y ese es el problema.

- **`supabase db reset --linked`** — `db reset` a secas recrea la base local, que es inofensivo. Con `--linked` apunta a la nube y borra todo lo que haya ahí. A la nube solo se le hace `db push`.
- **`supabase config push`** — empuja toda la config local, `site_url = http://127.0.0.1:5173` incluido, y rompe los enlaces de los correos en producción. La config de la nube se cambia desde el dashboard.
- **Activar las credenciales de producción comentadas en `.env.local`** — hace que `pnpm backfill` y `pnpm usuario:dev` escriban en la base real. `crear-usuario-dev.mjs` aborta solo si la URL no es `127.0.0.1`, pero el backfill no tiene esa red.

Y una regla sin comando: **una migración ya aplicada no se edita**. Lo que haya que corregir va en una migración nueva.

---

« [Índice](../README.md) · [Entorno](entorno.md) · [Tienda WooCommerce](tienda-woocommerce.md) · [Convenciones](convenciones.md)
