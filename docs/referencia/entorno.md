« [Índice](../README.md)

# Entorno de desarrollo

Hechos verificados en la máquina de desarrollo. La base es del **2026-09-11** (tareas 01 y 02); lo de PWA y push, del **2026-09-15**.

## Versiones instaladas

| Herramienta | Versión |
|---|---|
| Node | 24.12.0 |
| pnpm | 10.33.2 |
| git | 2.52.0.windows.1 |
| Vite | 8.3.0 |
| TypeScript | 6.0.3 |
| React | 19.2.8 |
| Vitest | 5.0.0 |
| Tailwind | 4.3.3 |
| oxlint | 1.82.0 |

El scaffold actual de Vite trae **oxlint** en vez de ESLint, y **TypeScript 6**. El plan original suponía Vite 7 y TS 5.9.

## `.claude/worktrees` contiene otro proyecto

Dentro de la carpeta del proyecto viven worktrees de git de **otro repositorio** (AgroTrace, por lo que se ve en los paths). Traen sus propios tests y componentes React.

Consecuencia: Vitest y oxlint los recogían y ejecutaban 8 tests ajenos junto a los nuestros.

Ambas herramientas están acotadas explícitamente:

```ts
// vite.config.ts
test: {
  include: ["src/**/*.test.ts", "supabase/functions/**/*.test.ts"],
}
```

```json
// package.json
"lint": "oxlint src"
```

`ignorePatterns` en `.oxlintrc.json` **no** surtió efecto sobre esos directorios; acotar por argumento de CLI sí.

Si en el futuro `pnpm test` reporta más archivos de los esperados, es esto.

## `baseUrl` está deprecado en TypeScript 6

Usarlo devuelve:

```
error TS5101: Option 'baseUrl' is deprecated and will stop functioning in TypeScript 7.0.
```

No hace falta: desde TS 5.4 `paths` se resuelve relativo al `tsconfig.json` que lo declara. El alias `@/*` funciona solo con `paths`.

## `tsc -b` no acepta `--noEmit`

El script de typecheck es `tsc -b` a secas. Los `tsconfig` ya declaran `noEmit: true`, y pasar la bandera junto a `-b` es un error de configuración.

## `Intl` usa espacio duro para los miles

`new Intl.NumberFormat("es-CR").format(15000)` devuelve `15` + **U+00A0** + `000`, no un espacio normal. Los dos se ven idénticos en la salida de un test fallido.

Ver [`plans/fase-a/02-utils.md`](../plans/fase-a/02-utils.md).

## Supabase usa claves Publishable / Secret, no anon / service_role

El stack local de la CLI 2.98 imprime:

```
│ Publishable │ sb_publishable_... │
│ Secret      │ sb_secret_...      │
```

Reemplazan a las claves `anon` y `service_role` (JWT que empezaban con `eyJ...`). La correspondencia es directa: **publishable** donde antes iba anon, **secret** donde antes iba service_role. Las variables del proyecto se llaman `VITE_SUPABASE_PUBLISHABLE_KEY` y `SUPABASE_SECRET_KEY`.

Las claves del stack local son valores compartidos por defecto, iguales en todas las máquinas. No son secretas y no sirven contra la nube.

**Hay dos proyectos:**

| Entorno | URL | Cuándo |
|---|---|---|
| Local | `http://127.0.0.1:54321` | Desarrollo, tareas 03–12 |
| Nube | `https://zozllarqgtupmokortmk.supabase.co` | Tarea 13, despliegue |

Las credenciales de la nube están **comentadas** en `.env.local`. Activarlas haría que `pnpm backfill` escriba en la base real.

## `revoke execute ... from anon, authenticated` no alcanza

Postgres otorga `EXECUTE` a `PUBLIC` en toda función nueva, y `anon`/`authenticated` heredan de ahí. Revocar solo de esos dos roles no hace nada.

Cómo se detecta: invocar la función con la publishable key y mirar el mensaje.

| Mensaje | Significa |
|---|---|
| `permission denied for function upsert_pedido` | El revoke funciona |
| `new row violates row-level security policy` | **El revoke NO funciona** — la función se ejecutó y solo RLS la detuvo |

El segundo caso es el que aparece si falta `revoke execute on function ... from public;`.

## El linter de seguridad de Supabase, corrido contra la nube

`get_advisors` sobre el proyecto en la nube el 2026-09-11, después del primer `db push`. Cuatro hallazgos, tres de ellos ruido y uno real.

| Hallazgo | Nivel | Veredicto |
|---|---|---|
| `function_search_path_mutable` en `set_updated_at` y `upsert_pedido` | WARN | **Real** — corregido |
| `rls_enabled_no_policy` en `webhook_eventos` | INFO | Intencional — deny-all a propósito |
| `extension_in_public` (`pg_trgm`) | WARN | Aceptado — ver [pendientes](../specs/09-pendientes.md) |
| `rls_auto_enable()` ejecutable por anon | WARN | Infraestructura de Supabase, no del proyecto |

### El único real: `search_path` mutable

Las funciones referencian `pedidos` sin calificar el esquema. Sin `search_path` fijo, ese nombre se resuelve contra el search_path de quien invoca: un rol que pueda crear un esquema propio y anteponerlo consigue que la función escriba en *su* tabla.

Corregido en `20260911183259_fijar_search_path.sql`:

```sql
alter function set_updated_at() set search_path = public, pg_temp;
alter function upsert_pedido(jsonb) set search_path = public, pg_temp;
```

`pg_temp` va **al final** a propósito. Si va primero, una tabla temporal del atacante gana sobre la real — que es exactamente el agujero que se quería cerrar.

Se usó `public, pg_temp` y no `''` porque las funciones no califican los nombres de tabla.

### `webhook_eventos` sin policy es correcto

RLS activo y cero políticas significa que nadie lee la tabla salvo la secret key, que salta RLS. Es la bitácora cruda de los webhooks: guarda payloads completos de WooCommerce y no la consume el dashboard. Agregar una policy para callar al linter abriría datos sin que nadie los necesite.

### `rls_auto_enable()` no es nuestra

Es un event trigger que Supabase instala en los proyectos de la nube para activar RLS automáticamente en cada tabla nueva. Declara `returns event_trigger`, y PostgREST no puede invocar funciones con ese tipo de retorno: el `/rest/v1/rpc/rls_auto_enable` que menciona el linter no existe en la práctica. Además ya trae `set search_path to 'pg_catalog'`.

No se toca. Modificar infraestructura de la plataforma para silenciar un aviso genérico rompe más de lo que arregla.

## La nube ya tiene el esquema

`supabase db push` corrió el 2026-09-11. El proyecto `zozllarqgtupmokortmk` tiene `pedidos` y `webhook_eventos` con RLS y cero filas.

**Que la nube esté migrada no cambia dónde se desarrolla.** `.env.local` sigue apuntando a `127.0.0.1:54321` y las credenciales de producción siguen comentadas.

**Nunca correr `supabase db reset --linked`.** `db reset` sin bandera recrea la base local, que es inofensivo. Con `--linked` apunta a la nube y borra todo lo que haya ahí. A la nube solo se le aplica `supabase db push`, que suma migraciones sin destruir nada.

## `enable_signup = false` en `[auth.email]` apaga el login, no el registro

`config.toml` tiene tres claves con ese nombre. Solo una cierra el registro público:

| Sección | Qué controla de verdad |
|---|---|
| `[auth]` | **El registro.** Esta es la que hay que poner en `false` |
| `[auth.email]` | El proveedor de email **entero**, login incluido |
| `[auth.sms]` | El proveedor de SMS. Ya viene en `false` |

La CLI mapea `[auth.email].enable_signup` a `GOTRUE_EXTERNAL_EMAIL_ENABLED`. Ponerlo en `false` deja el login así:

```
{"code":422,"error_code":"email_provider_disabled","msg":"Email logins are disabled"}
```

Configuración correcta para un solo usuario creado a mano:

```toml
[auth]
enable_signup = false

[auth.email]
enable_signup = true    # NO tocar: apaga el login
```

Se comprueba con dos llamadas, no con una. `POST /auth/v1/signup` debe devolver `signup_disabled`, y `POST /auth/v1/token?grant_type=password` debe devolver un `access_token`. Mirar solo la primera da un falso verde: con el proveedor apagado, el signup también falla.

## `supabase db reset` borra `auth.users`

Recrea la base entera, y el esquema `auth` va incluido. El usuario del dashboard desaparece y el login empieza a devolver `invalid_credentials` sin que nada en el código haya cambiado.

Reponerlo:

```bash
pnpm usuario:dev
```

Lee `DEV_LOGIN_EMAIL` y `DEV_LOGIN_PASSWORD` de `.env.local`, que no se commitea. Es idempotente: si el usuario existe, no hace nada.

El script aborta si `SUPABASE_URL` no apunta a `127.0.0.1` o `localhost`. Escribe usuarios con la secret key, y apuntarlo a la nube por accidente crearía una cuenta real con una contraseña de desarrollo.

## Vite no siempre usa el 5173

Si hay otros proyectos corriendo, Vite salta de puerto:

```
Port 5173 is in use, trying another one...
```

`site_url` y `additional_redirect_urls` en `config.toml` apuntan al 5173. No afecta a `signInWithPassword`, que no redirige, pero sí a los magic links de la Fase D. Leer el puerto real de la salida de `pnpm dev`.

## Tailwind v4 borra el color por defecto de los bordes

`preflight.css` de v4 resetea así:

```css
border: 0 solid;
```

Sin color. El valor inicial de `border-color` es `currentColor`, así que un `className="border"` pelado hereda el color del texto y pinta un borde casi negro. En v3 el default era `gray-200`.

Todo borde necesita su color explícito:

```tsx
className="rounded-lg border border-neutral-200 bg-white"
```

No da error ni advertencia. Se ve, y se ve feo.

## Las Edge Functions no ven un secret llamado `SUPABASE_SECRET_KEY`

El prefijo `SUPABASE_` está reservado: el runtime inyecta sus propias variables y no deja definir otras con ese nombre. Lo que hay disponible dentro de una función, verificado imprimiendo `Deno.env.toObject()`:

| Variable | Contenido |
|---|---|
| `SUPABASE_URL` | `http://kong:8000` en local — la interna del contenedor, no `127.0.0.1` |
| `SUPABASE_SERVICE_ROLE_KEY` | El JWT `eyJ...` de servicio. **Es la que se usa** |
| `SUPABASE_SECRET_KEYS` | Plural, y en JSON: `{"default":"sb_secret_..."}` |
| `SUPABASE_PUBLISHABLE_KEYS` | Plural, mismo formato |
| `SUPABASE_ANON_KEY`, `SUPABASE_DB_URL`, `SUPABASE_JWKS` | Resto del juego |

Se usa `SUPABASE_SERVICE_ROLE_KEY` porque es un solo valor y no hay que parsear JSON. Las dos en plural existen para rotación de claves.

Con el nombre equivocado la función ni arranca:

```
runtime has escaped from the event loop unexpectedly: event loop error:
Error: Falta la variable de entorno SUPABASE_SECRET_KEY
```

y el cliente ve `{"code":"WORKER_ERROR","message":"Function exited due to an error"}` con 500. El motivo real solo aparece en el log de `functions serve`.

## Toda Edge Function exige JWT salvo que se diga lo contrario

El gateway responde antes de que la función corra:

```
{"msg":"Error: Missing authorization header"}
```

WooCommerce no manda ese header, así que sin desactivarlo ningún webhook llega nunca. Son dos lugares distintos:

```toml
# supabase/config.toml — para el deploy
[functions.woo-webhook]
verify_jwt = false
```

```bash
# para servir en local: la bandera hace falta igual, serve no lee config.toml
supabase functions serve woo-webhook --env-file supabase/functions/.env --no-verify-jwt
```

Deja el endpoint público. Eso es aceptable **solo** porque la firma HMAC lo autentica dentro de la función.

## La CLI ignora las carpetas de función que empiezan con `_`

`supabase/functions/_lo-que-sea` se trata como código compartido, no como función. Servirla devuelve `Function not found` sin ninguna explicación.

## `config.toml` no configura la nube

`enable_signup = false` bajo `[auth]` gobierna **solo el stack local**. El proyecto en la nube trae el registro abierto por defecto, y desplegar la función o empujar migraciones no lo cambia.

Con la publishable key — la que viaja dentro del bundle que descarga cualquier visitante — se puede crear una cuenta desde afuera:

```
POST /auth/v1/signup  ->  HTTP 200
{"id":"...","email":"...","confirmation_sent_at":"..."}
```

Y la policy de `pedidos` deja leer a cualquier rol `authenticated`, sin más condiciones: una cuenta registrada así ve nombres, teléfonos, correos y montos de todos los clientes.

Lo único que frena el paso es que Supabase pide confirmar el correo — la respuesta trae un objeto User y no una sesión. Hace falta un buzón real, nada más.

Se cierra en el dashboard:

```
Authentication -> Sign In / Providers -> Email -> "Allow new users to sign up" -> apagado
```

**No usar `supabase config push` para esto.** Empuja toda la config local, `site_url = http://127.0.0.1:5173` incluido, y eso rompe los enlaces de los correos en producción.

Cómo se comprueba, sin dejar basura:

1. `POST /auth/v1/signup` con la publishable key y una dirección inexistente del dominio del propio cliente — si algún correo sale, rebota y no molesta a nadie de afuera.
2. Si devuelve 200, el registro está abierto: borrar el usuario con `DELETE /auth/v1/admin/users/<id>` usando la secret key.
3. Si devuelve 422 `signup_disabled`, está cerrado.

Un detalle del paso 1: Supabase rechaza `@example.com` con `email_address_invalid` antes de mirar si el registro está abierto. Probar con ese dominio da un falso "cerrado".

## Git: el repositorio ya existía

Tiene remoto en `https://github.com/jasonmoyaB/OrganicoCR-Dashboard.git` y dos commits previos con skills en `.agents/`.

**El remoto importa para los secretos:** `.gitignore` cubre `.env.local`, que tiene las credenciales reales de la tienda. Verificar antes de cualquier `git add -A`:

```bash
git status --porcelain --ignored | grep "\.env\.local"
```

Debe imprimir `!! .env.local` — las dos admiraciones significan "ignorado".

## El scaffold de Vite pisa el README.md de la raíz

`cp -r .tmp-scaffold/* .` sobrescribe `README.md` con el de Vite. Si ya había uno, se pierde. Restaurarlo con `git restore README.md`.

## El correo de `organicocr.store` no está en Google Workspace

Verificado el 2026-09-12. Importa porque la Fase B depende de con qué API se lee el buzón del banco.

```
MX  0  mail.organicocr.store   -> 162.241.225.231   (Bluehost)
MX  1  aspmx.l.google.com      -> Google
MX  5  alt1/alt2.aspmx.l.google.com
MX 10  alt3/alt4.aspmx.l.google.com
```

Los MX de Google están puestos, pero **prioridad 0 gana**: el correo entrante lo recibe el servidor de Bluehost, no Google. Tres señales más lo confirman:

- El SPF es `v=spf1 a mx include:websitewelcome.com ~all` — sin `include:_spf.google.com`. Si Workspace enviara correo del dominio, fallaría SPF.
- `google._domainkey.organicocr.store` no existe: no hay DKIM de Google.
- Lo único de Google en el DNS es un `google-site-verification`, que también lo pone Search Console.

Se comprueba sin herramientas extra:

```bash
curl -s "https://dns.google/resolve?name=organicocr.store&type=MX" | grep -oE '"data":"[^"]*"'
```

**Consecuencia para la Fase B:** `gmail.readonly` es un *restricted scope* de Google. Una app OAuth "Internal" de Workspace no necesita verificación y su refresh token no expira; una app "External" queda en modo *Testing*, y ahí **el refresh token expira a los 7 días**. Publicarla con un restricted scope exige verificación con auditoría de seguridad anual pagada.

O sea: si los correos del banco llegan a este buzón, la ruta Gmail API no es sostenible y hay que capturarlos de otra forma (reenvío automático a una Edge Function, igual que `woo-webhook`). Queda por confirmar con el cliente a qué buzón llegan realmente — puede ser un Gmail personal distinto de la dirección del dominio.

## Las Edge Functions sí pueden abrir sockets TCP crudos

Verificado el 2026-09-12, **en el runtime local y en el de la nube**, con una función desechable que se desplegó, se probó y se borró.

```
Deno.connectTls({ hostname: "mail.organicocr.store", port: 993 })
-> * OK [CAPABILITY IMAP4rev1 ... AUTH=PLAIN AUTH=LOGIN] Dovecot ready.
```

Importa porque el runtime de Edge Functions se parece a Deno Deploy, donde durante mucho tiempo lo único disponible fue `fetch`. No es el caso: `Deno.connectTls` funciona, así que un protocolo que no sea HTTP —IMAP, SMTP, Postgres directo— es alcanzable desde una función.

El servidor de correo de la tienda, de paso: Dovecot, TLS 1.3, certificado de `mail.organicocr.store` válido hasta el 2026-11-05, con `AUTH=PLAIN` y `AUTH=LOGIN` (sin OAuth, o sea usuario y contraseña).

Se comprueba sin credenciales, porque el saludo del servidor llega antes del login:

```bash
node -e 'require("node:tls").connect({host:"mail.organicocr.store",port:993,servername:"mail.organicocr.store"},function(){this.once("data",d=>{console.log(d.toString());this.end()})})'
```

## Probar `correo-poll` sin el buzón real: Greenmail

Verificado el 2026-09-14. Levanta un IMAP de verdad en Docker y deja correr la función entera.

```bash
docker run -d --name greenmail -p 3025:3025 -p 3993:3993 -v "<certs>:/certs:ro"   -e GREENMAIL_OPTS='-Dgreenmail.setup.test.smtp -Dgreenmail.setup.test.imaps      -Dgreenmail.hostname=0.0.0.0 -Dgreenmail.users=info:clave-local@organicocr.store      -Dgreenmail.tls.keystore.file=/certs/greenmail.p12 -Dgreenmail.tls.keystore.password=changeit'   greenmail/standalone:2.1.0
node scripts/sembrar-greenmail.mjs
```

Cuatro trampas, todas encontradas peleándolas:

- **Sin `-Dgreenmail.hostname=0.0.0.0` bindea a `127.0.0.1` dentro del contenedor**, y el mapeo de puertos no llega a nada. `-Dgreenmail.setup.smtp` (sin `test.`) además cambia los puertos a 25 y 993.
- **`-Dgreenmail.users=usuario:clave@dominio`**, en ese orden. Con `info@organicocr.store:clave-local` crea un usuario llamado `info@clave-local`. Y el id de login que después acepta es **`info`**, la parte local, no el correo entero — al revés que Dovecot.
- **El certificado que trae Greenmail no tiene SAN**, y rustls (el TLS de Deno) lo rechaza siempre. Tampoco sirve un autofirmado suelto: da `invalid peer certificate: CaUsedAsEndEntity`, porque `openssl req -x509` marca `CA:TRUE` y rustls no acepta un cert de CA como cert de servidor. Hace falta una cadena de dos niveles — CA propia más un cert de servidor con `basicConstraints=CA:FALSE` y `subjectAltName` — empaquetada en un PKCS12, y la CA en `CORREO_IMAP_CA_PEM`.
- **Greenmail no soporta `AUTHENTICATE PLAIN`, solo la orden `LOGIN`**; Dovecot soporta las dos y anuncia `SASL-IR`. Por eso `cliente-imap.ts` elige el mecanismo leyendo `CAPABILITY`. El corolario incómodo: el camino que ejercita Greenmail (`LOGIN`) **no** es el que se va a usar en producción (`AUTHENTICATE PLAIN`).

## `pg_net` vive en `extensions`, pero sus funciones están en `net`

`select ... from pg_extension` dice que `pg_net` está en el esquema `extensions`, pero la función se llama `net.http_post`. Escribir `extensions.net.http_post` falla con `cross-database references are not implemented`: Postgres lee un nombre de tres partes como *base.esquema.función*. `pg_cron`, en cambio, va en `pg_catalog`.

## Deno exige la extensión `.ts` en los imports; vitest no

`import { x } from "./modulo"` pasa los tests y revienta al desplegar con `Module not found ... Maybe add a '.ts' extension`. El error aparece como `BOOT_ERROR` / `InvalidWorkerCreation` en la respuesta HTTP, y el motivo real solo está en el log de `functions serve`. **Una suite verde no prueba que la Edge Function arranque.**

## Línea de fin CRLF

Git avisa `LF will be replaced by CRLF` en cada archivo. Es el comportamiento normal de `core.autocrlf` en Windows, no un problema.

## `.env` sin salto de línea final: anexar rompe la última clave

`supabase/functions/.env` no termina en `
`. Un `cat >> archivo` pega lo nuevo al final de la línea anterior y produce una variable con nombre imposible:

```
CORREO_IMAP_CLAVE=xxxVAPID_CONTACTO=mailto:info@organicocr.store
```

El síntoma no apunta a esto: la Edge Function dice `Falta la variable de entorno VAPID_CONTACTO` mientras la variable se lee clarísima en el archivo. Se detecta con `tail -3 archivo | cat -A` —el `$` marca dónde termina cada línea— y se evita anexando con un `echo` en medio:

```bash
{ cat supabase/functions/.env; echo; nuevas_lineas; } > destino
```

**Y un aviso:** ese archivo tiene la contraseña del buzón. Cualquier `cat` suyo la imprime en claro.

## El service worker no se registra en `pnpm dev`

A propósito. `registrarServiceWorker()` sale temprano si `import.meta.env.PROD` es falso: Vite sirve cada módulo por separado en dev y un worker que cachea deja al navegador mostrando código viejo después de cada edición.

La única prueba local del PWA es `pnpm build && pnpm preview`. **localhost cuenta como contexto seguro**, así que ahí el worker se instala, la app se puede instalar y el push funciona igual que en Vercel.

## `vite preview` bindea IPv6, no `127.0.0.1`

Anuncia `http://localhost:4173/` y escucha en `::1`. Pegarle a `http://127.0.0.1:4173` devuelve `HTTP 000` y `curl` sale con código 7, como si el servidor no existiera. Usar `localhost`, o `vite preview --host 127.0.0.1`.

## Chrome: el perfil en ruta larga rompe el almacenamiento

Al manejar Chrome por CDP para probar el PWA, con `--user-data-dir` dentro del scratchpad de la sesión:

```
Failed to execute 'open' on 'CacheStorage': Unexpected internal error.
```

y `navigator.serviceWorker.getRegistrations()` devuelve `[]` **aunque `register()` haya resuelto bien con su scope**. Chrome cuelga del perfil rutas como `Default/Service Worker/CacheStorage/<hash>/...`, que se pasan del `MAX_PATH` de Windows. No hay error que lo diga.

Con el perfil en `C:/Users/<vos>/AppData/Local/Temp/pp` funciona todo. Y **con ventana, no `--headless`**: en headless el CacheStorage y los service workers no son fiables ni con ruta corta.

## `SUPABASE_SERVICE_ROLE_KEY` no es lo que el trigger saca de Vault

En local las dos son la misma llave de demo, así que comparar una contra otra funciona y no se nota nada. **En la nube no coinciden**: lo que el runtime inyecta como `SUPABASE_SERVICE_ROLE_KEY` depende del esquema de claves del proyecto —que cambió con las publishable/secret— y el secreto de Vault es el JWT legacy de `service_role`.

Síntoma: la Edge Function le devuelve 401 a su propia base, visible solo en `net._http_response`, porque `net.http_post` es asíncrono y el SQL que lo encoló ya terminó bien.

Lo que sí es estable es el **claim**. El JWT de Vault trae:

```json
{"iss":"supabase","ref":"<ref>","role":"service_role","iat":...,"exp":...}
```

Así que la función decodifica el bearer y exige `role = service_role`. Lee el payload sin verificar la firma, y **eso solo es seguro porque `verify_jwt` sigue activo**: el gateway la verifica antes de que la función corra.

## Probar Web Push sin Google ni Apple

No hace falta un servicio de push real. Un servidor HTTP de 20 líneas en el host, más un par ECDH P-256 generado con `node:crypto` para el `p256dh`, alcanza para verificar la cadena entera. Desde el contenedor de la Edge Function, el host es `host.docker.internal`.

Lo que se ve llegar, y que es exactamente lo que espera un servicio real: `content-encoding: aes128gcm`, `TTL: 2419200` y `authorization: vapid t=<jwt>`. Devolviendo `201` en un endpoint y `410` en otro se prueban de una vez el camino feliz y el borrado de suscripciones muertas.

---

« [Índice](../README.md) · [Tienda WooCommerce](tienda-woocommerce.md) · [Convenciones](convenciones.md)
