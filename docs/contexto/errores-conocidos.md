# Errores conocidos y trampas

Ruta corta. El detalle largo está en `docs/referencia/errores-conocidos.md` y `docs/referencia/entorno.md`.

## Entorno y tooling

- **`.claude/worktrees/` contiene worktrees de OTRO repositorio**, con sus propios tests y componentes React. Por eso `vite.config.ts` declara `test.include` explícito y el script de lint pasa el directorio por CLI (`oxlint src`): el `ignorePatterns` de `.oxlintrc.json` **no** surtió efecto sobre esos directorios. Si `pnpm test` reporta más archivos de los esperados, es esto.
- **`tsc -b` no acepta `--noEmit`**, y `baseUrl` está deprecado en TS 6: el alias `@/*` funciona solo con `paths`.
- **`Intl.NumberFormat("es-CR")` separa los miles con U+00A0**, no con espacio normal. En la salida de un test fallido se ven idénticos — por eso `format-colones.test.ts` escribe ` ` con escape.
- **Vite salta de puerto** si el 5173 está ocupado, pero `config.toml` apunta al 5173. Leer el puerto real de la salida.
- **`.env.local` tiene credenciales reales de la tienda.** El `.gitignore` usa `.env` + `.env.*` + `!.env.example` porque `*.local` **no** agarra un respaldo llamado `.env.local.bak-local`.

## Frontend

- **Tailwind v4 resetea `border: 0 solid` sin color**, así que un `className="border"` pelado hereda `currentColor` y pinta casi negro. Todo borde necesita su color explícito (`border border-borde`).
- **`Uint8Array` genérico en TS 5.7+**: el default incluye `SharedArrayBuffer`, que `applicationServerKey` no acepta. Hay que declarar `Uint8Array<ArrayBuffer>` y construir por largo — ver `src/utils/base64url-a-bytes.ts`.
- **Un `estado_pago` o `metodo_extraccion` desconocido revienta el mapeo a propósito**, con el identificador de la fila en el mensaje. Es preferible a mostrar una pantalla con datos mal interpretados.

## PWA y push

- **En `pnpm dev` no hay service worker, no aparece "Instalar" y la franja de notificaciones nunca se muestra.** Es por diseño: `registrarServiceWorker()` sale temprano si no es `import.meta.env.PROD`. Se prueba con `pnpm build && pnpm preview` (localhost cuenta como contexto seguro).
- **La franja "Activar notificaciones" tampoco aparece en producción si falta `VITE_VAPID_PUBLIC_KEY`.** `puedeRecibirPush()` la exige junto con `serviceWorker`, `PushManager` y `Notification`: pedirle permiso a alguien para algo que no va a funcionar es peor que no pedírselo.
- **Regenerar las llaves VAPID invalida todas las suscripciones.** Rotarlas obliga a vaciar `suscripciones_push` y pedir permiso de nuevo en cada dispositivo.
- **En iPhone el push solo existe si la app está instalada** en la pantalla de inicio (iOS 16.4+). Por eso `index.html` lleva los `apple-mobile-web-app-*`: iOS ignora el manifest.
- **`getRegistration` y no `ready`**: `ready` nunca resuelve si no hay worker instalado y dejaría el aviso colgado en "cargando" para siempre.
- **Un `db reset` borra la fila de la suscripción pero el navegador sigue suscrito**: el permiso figura dado y no llega un solo aviso. Por eso `estadoReal()` repone la fila al arrancar.
- **Probar el PWA en Chrome exige perfil en ruta corta y ventana real.** Un `--user-data-dir` largo hace que `CacheStorage` falle sin decir por qué (MAX_PATH de Windows), y `--headless` no da service workers fiables.
- **`vite preview` bindea IPv6**: `curl http://127.0.0.1:4173` devuelve exit 7. Pegarle a `http://localhost:4173`.

## Supabase — permisos

- **`new row violates row-level security policy` al invocar una función = la función SÍ corrió.** Falta el `revoke ... from public`. `permission denied for function` es el revoke funcionando, no un bug. Un `PGRST202` con 404 es ambiguo: puede ser la firma del argumento y no el permiso, así que no sirve como prueba.
- **Hacen falta los DOS revokes**, siempre. Se comprueba en la base, que es la única fuente fiable:
  ```sql
  select proname, array_to_string(proacl, ',') from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and prosecdef;   -- solo postgres y service_role
  ```
- **`permission denied for table pedidos` (42501) en un PATCH** es correcto: `authenticated` tiene privilegio solo sobre la columna `estado_pago`.
- **`supabase db reset` borra `auth.users`** y el login empieza a dar `invalid_credentials` sin que nadie haya tocado el código → `pnpm usuario:dev`.
- **En `config.toml` hay tres `enable_signup`.** Solo el de `[auth]` cierra el registro; el de `[auth.email]` apaga el proveedor de email **entero, login incluido**.
- **`config.toml` no configura la nube.** El registro público se cierra desde el dashboard de Supabase.

## Supabase — Edge Functions

- **Dentro de una Edge Function no existe `SUPABASE_SECRET_KEY`**: el prefijo `SUPABASE_` está reservado. Se usa `SUPABASE_SERVICE_ROLE_KEY`, que el runtime inyecta solo. Con el nombre equivocado la función ni arranca y el cliente solo ve un `WORKER_ERROR` 500 — el motivo real está en el log de `functions serve`.
- **Toda Edge Function exige JWT salvo que se diga lo contrario.** WooCommerce no manda ese header: hace falta `verify_jwt = false` en `config.toml` **y** `--no-verify-jwt` al servir en local (`serve` no lee `config.toml`).
- **La CLI trata `supabase/functions/_*` como código compartido, no como función**: servirla devuelve `Function not found` sin explicación. Por eso `_extractor/` no es una función.
- **`supabase/functions/.env` sin salto de línea final** hace que un `cat >>` pegue la clave nueva al final de la anterior (`CORREO_IMAP_CLAVE=xxxVAPID_CONTACTO=...`) y la función falle diciendo que falta una variable que está ahí. Se ve con `tail -3 archivo | cat -A`.
- **`enviar-push` devolviéndole 401 al trigger de su propia base** era comparar el bearer contra `SUPABASE_SERVICE_ROLE_KEY`: en la nube ese valor no es el mismo string que sale de Vault. Si el 401 reaparece, quien llamó no es `service_role` y el 401 es correcto.

## Correo y matching

- **El monto no puede terminar en separador.** Con `[\d.,]+` el patrón se tragaba el punto final de la oración (`CRC 1,000,000.00.`) y el normalizador rechazaba la cifra entera: el aviso se perdía sin dejar rastro. Va `[\d.,]*\d`.
- **Los montos vienen en formato anglosajón** (`2,412.01`), al revés de lo que decía la descripción del dueño. `normalizarMontoCRC` decide por la cantidad de dígitos tras el último separador.
- **La moneda escrita es obligatoria en el patrón**: Davibank avisa ingresos en dólares con la misma redacción (`un monto de 500.00 USD`), y leerlos como colones los haría cuadrar con el pedido equivocado.
- **`Devolución de crédito directo Entrante` hay que descartarla explícitamente**: trae un monto en CRC con la misma forma que un cobro y registraría plata que nunca entró. Igual que `Envío exitoso de…`, `Recepción de débito…` y `debitando su cuenta`.
- **El nombre del remitente viene truncado a 20 caracteres y con guiones bajos** (`CONSULTORES_AGROAMBI`): el matcher compara por similitud (`pg_trgm`), nunca por igualdad.
- **El BAC no dice quién mandó la plata.** Sin nombre, el score no pasa de 0.75 y esos pagos siempre caen en "Revisar". No es un bug.
- **Techo real de 0.80 para pagos de empresa**: las plantillas de transferencia SINPE y pago inmediato no traen motivo, así que el término de referencia (0.20) nunca se activa y nunca llegan al umbral de 0.85. Solo el SINPE Móvil puede auto-conciliarse.
- **`n:*` en `UID SEARCH`** puede devolver el UID más alto aunque sea menor que `n`: el filtro en TypeScript es el que manda, no el servidor.
- **El cursor solo se guarda si la corrida entera salió bien**, y de ahí salió el bug del lote (ver `LOTE_MAXIMO`). Corregido también el caso inverso: un update fallido ya no da la corrida por buena (commit `70bb082`).

## WooCommerce

- **El hosting (Bluehost) descarta el header `Authorization`** antes de WordPress: hay que autenticar por query string (`?consumer_key=...&consumer_secret=...`) o da `401`.
- **Sin `status=any` el backfill pierde pedidos en silencio**, sin error.
- **`date_created_gmt` viene sin `Z`** (`"2026-09-07T17:34:26"`) y `new Date()` lo interpreta en la zona local: los pedidos aparecen desplazados 6 horas. Hay que concatenar la `Z`.
- **Los totales llegan como `"1965"`**, sin decimales: la tienda usa CRC así. No es un error.
- **El ping de activación del webhook no trae firma HMAC** y el cuerpo es `webhook_id=N` form-encoded. Lo cubre `es-ping.ts`, que responde 200 antes de verificar — **el único cuerpo que se contesta sin HMAC**.

## Lo que destruye datos reales, sin mensaje de error

`supabase db reset --linked` · `supabase config push` · activar las credenciales de producción comentadas en `.env.local` · editar una migración ya aplicada.
