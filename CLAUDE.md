# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Dashboard de conciliación de pagos para la tienda WooCommerce de OrganicoCR: cruza los pagos que llegan por correo del banco contra los pedidos de la tienda y muestra quién debe y quién pagó. Un solo usuario (el dueño), sin SSR, sin roles.

**El código, los nombres, los comentarios y los mensajes de error van en español**, igual que el dominio: `cliente_nombre`, no `customer_name`.

## Comandos

**pnpm siempre** — el repo tiene `pnpm-lock.yaml` y nada más. Nunca `npm`/`npx`/`yarn`.

```bash
pnpm dev                  # Vite. Puede NO usar el 5173 si está ocupado: leé el puerto real de la salida
pnpm typecheck            # tsc -b
pnpm lint                 # oxlint src
pnpm test                 # vitest run
pnpm build                # tsc -b && vite build
```

Un solo test, o un caso:

```bash
pnpm exec vitest run src/utils/format-colones.test.ts
pnpm exec vitest run -t "lanza error ante texto no numérico"
```

Supabase (stack local; el proyecto está linkeado a `zozllarqgtupmokortmk`):

```bash
supabase start
supabase db reset      # recrea la base LOCAL. Borra auth.users -> después: pnpm usuario:dev
pnpm usuario:dev       # repone el usuario del dashboard desde .env.local. Idempotente
supabase db push       # aplica migraciones a la NUBE. Suma, no destruye
supabase gen types typescript --local > src/types/database.types.ts
supabase functions serve woo-webhook --env-file supabase/functions/.env --no-verify-jwt
pnpm backfill          # trae pedidos históricos de Woo (lee .env.local)
```

PWA y notificaciones (se corren una vez, no en cada build):

```bash
node scripts/generar-vapid.mjs                                   # par de llaves VAPID. Imprime las líneas listas para pegar
powershell -ExecutionPolicy Bypass -File scripts/generar-iconos.ps1   # regenera public/icons desde el logo
pnpm build && pnpm preview                                       # única forma de probar el PWA en local: en `pnpm dev` el worker no se registra
```

**Nunca `supabase db reset --linked`** — apunta a la nube y borra todo lo que haya ahí. A la nube solo se le hace `db push`.

Antes de dar algo por terminado: `pnpm typecheck`, `pnpm test` y `supabase db reset` sin errores. Si no podés correr `db reset`, documentá el bloqueo.

Scan de salud: `pnpm dlx react-doctor@latest --verbose` debe dar 100/100. Las supresiones viven en `doctor.config.json` con su evidencia en `.react-doctor/false-positives.md`; el agente `react-doctor` hace el ciclo completo.

## Arquitectura

Tres flujos independientes que convergen en Postgres. Ninguno necesita a los otros para funcionar:

```
WooCommerce --webhook HMAC--> [woo-webhook] --> upsert_pedido --> tabla pedidos ---+
info@ (IMAP) --pg_cron 5min--> [correo-poll] --> correos_banco --> pagos --> [matcher SQL] --> conciliaciones
                                                                                  |
React 19 + Vite 8 + TanStack Query <-- supabase-js + RLS <-------------------------+
                                                                                  |
pagos --trigger--> [enviar-push] --Web Push cifrado--> el teléfono del dueño <-----+
```

Stack: React 19 · TypeScript 6 · Vite 8 · Tailwind v4 · TanStack Query v5 · Supabase (Postgres + Edge Functions en Deno + `pg_cron` + Vault) · Vercel estático. Alias `@/*` → `src/*`.

**Capas, y la dirección de las dependencias nunca al revés** (detalle en `docs/referencia/convenciones.md`):

```
components -> hooks -> services -> utils        components -> types / constants
```

Componentes sin fetch ni lógica de negocio · hooks sin JSX · services sin estado ni UI · utils puros, sin imports de framework. Un componente no importa de otro componente de otra feature. Lo transversal vive en la raíz de `src/` (`lib/`, `utils/`, `constants/`, `types/`); lo demás en `src/features/<nombre>/{components,hooks,services,types}`.

Límites: 150 líneas por archivo · 30 por función · ≤3 parámetros · ≤3 niveles de indentación · ≤5 props. Archivos en kebab-case.

**El mapeo `snake_case` → `camelCase` ocurre una sola vez, en el service.** Ningún componente ve nunca un `cliente_nombre` (ver `src/features/pedidos/services/pedidos-service.ts`).

`src/types/database.types.ts` es generado por la CLI. Editarlo a mano garantiza que la próxima regeneración borre el cambio.

## Invariantes del dominio — romperlas cuesta plata real

Las justificaciones completas están en `docs/specs/03-principios.md`. Si una implementación contradice alguna, la implementación está mal.

1. **WooCommerce es solo lectura.** El webhook entra, el backfill lee. Nada sale hacia la tienda. No hay credenciales de escritura.
2. **`pedidos.estado_pago` es nuestro y manda**; `estado_woo` es informativo. El estado inicial se deriva de Woo **una sola vez, al insertar** (`completed`→`pagado`, `cancelled`/`refunded`/`failed`→`anulado`, todo lo demás incluido lo desconocido→`pendiente`). Ningún `order.updated` lo vuelve a tocar. Única excepción, en la dirección segura: un pedido `pendiente` que la tienda anula pasa a `anulado`. Un `pagado` **nunca** se degrada. La regla vive en la función SQL `upsert_pedido`, no en el código de aplicación.
3. **Montos como entero en céntimos** (`bigint`), nunca float. El matching compara por igualdad exacta y el float lo rompe de forma intermitente e irreproducible. Todo en colones, y Woo devuelve los totales sin decimales (`"1965"`).
4. **Ingest idempotente**: upsert por clave natural (`woo_order_id`, `mensaje_id`), nunca insert ciego. El payload crudo se guarda en `webhook_eventos` **antes** de procesarse — incluso cuando la firma es inválida — para poder re-procesar el histórico tras arreglar un bug de parseo.
5. **Los pagos son inmutables.** `UPDATE` revocado sobre la tabla **y** un trigger `pagos_inmutables` que lo rechaza también para la secret key, que salta privilegios y RLS. Si el parser mejora, se re-parsea desde `cuerpo_correo` y se crea una fila nueva.
6. **El LLM extrae datos del correo. El LLM no concilia.** Qué pago corresponde a qué pedido es una función SQL determinista. Sin monto exacto, un candidato no puede superar `sugerido`: un falso positivo esconde plata sin cobrar, un falso negativo solo genera una fila en "Revisar".
7. **Una migración = un cambio atómico, y una migración aplicada no se edita nunca.** Lo que haya que corregir va en una migración nueva (ver `20260911205500_endurecer_update_pedidos.sql`, que endurece la policy de la 182122 sin tocarla).
8. Los umbrales de matching viven en la tabla `config`, no como constantes: se calibran cambiando una fila, sin redeploy.

## Errores: todo lo que falla se le explica al dueño

- **Navegador:** los services tiran `Error` con contexto en español; `explicarError` (`src/utils/explicar-error.ts`) reconoce la causa (red, base caída, sesión vencida, permiso) y `AvisoError` la muestra con "Reintentar" y el detalle técnico plegado. Una causa nueva = una fila en `CAUSAS`.
- **Base caída / sin internet:** `AvisoConexion`, global. Se prende si alguna consulta falló por conexión y se apaga sola al volver.
- **Pantalla rota:** `LimiteDeError` alrededor de toda la app y de cada página (con `key={seccion}`, para que una rota no rompa las demás).
- **404:** `seccionInicial` devuelve null ante una ruta o `?seccion=` que no existe. Vercel reescribe todo a `index.html`, así que el 404 es del cliente (HTTP 200).
- **Servidor:** las Edge Functions escriben en `alertas_sistema` con `avisar(origen, mensaje)` y la borran con `resolver(origen)` (`supabase/functions/_alertas/`). Hoy: `correo` (buzón), `llm` (sin créditos o clave inválida; lo pasajero no avisa), `push`. El dashboard muestra lo que haya sin conocer los orígenes: sumar uno no toca el frontend. **Límite:** si el cron deja de correr del todo, nadie escribe la alerta.

## Seguridad

- Todo lo que empiece con `VITE_` **termina dentro del bundle que descarga el navegador**. Ahí solo van la URL de Supabase y la publishable key. La secret key (`sb_secret_...`) nunca lleva ese prefijo.
- La protección real vive en RLS, no en el frontend. Toda policy exige `(select auth.uid()) is not null` — con el `select`, si no Postgres lo evalúa por fila (advisor `auth_rls_initplan`; `seguridad.sql` lo verifica). Una policy no puede limitar columnas: eso es privilegio de columna (`grant update (estado_pago)`).
- **Toda función nueva necesita los DOS revokes, no uno.** Postgres otorga `EXECUTE` a `PUBLIC` en toda función nueva, y Supabase ademas otorga `EXECUTE` **nominal** a `anon` y `authenticated` por default privileges del esquema `public`. Revocar de `PUBLIC` no toca esos grants nominales, y revocar solo de `anon, authenticated` deja el de `PUBLIC`. Hacen falta las dos líneas:

  ```sql
  revoke execute on function mi_funcion(uuid) from public;
  revoke execute on function mi_funcion(uuid) from anon, authenticated;
  ```

  Verificado el 2026-09-14: con solo el revoke de `PUBLIC`, `POST /rest/v1/rpc/conciliar_pago` con la publishable key devolvía **204** — la función `security definer` corría para cualquiera que abriera el bundle. Con los dos, devuelve `permission denied for function`. Se comprueba en la base, que es la única fuente fiable:

  ```sql
  select proname, array_to_string(proacl, ',') from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and prosecdef;   -- solo postgres y service_role
  ```

  Cómo distinguir los fallos: `permission denied for function` = el revoke funciona; `new row violates row-level security policy` = la función corrió y solo RLS la detuvo; `PGRST202` con 404 = ambiguo, puede ser la firma del argumento y no el permiso — no sirve como prueba.
- Toda función nueva necesita `search_path` fijo (`public, pg_temp`, con `pg_temp` **al final** — si va primero, una tabla temporal ajena le gana a la real).
- `config`, `correos_banco` y `webhook_eventos` son deny-all: solo la secret key y las funciones `security definer` las leen. Llevan una policy `as restrictive ... using (false)` para `anon` y `authenticated` (`20260923170339`), así que una policy permisiva que se agregue por error no las abre. Para abrirlas hay que borrar esa policy.
- `.env.local` tiene credenciales reales de la tienda y está en `.gitignore`. Antes de cualquier `git add -A`, verificar que siga ignorado con `git status --porcelain --ignored`.

## PWA y notificaciones de pago

El dashboard se instala como app y avisa al teléfono cuando entra un pago, con la app cerrada. Verificado de punta a punta en local el 2026-09-15: `insert into pagos` → trigger → `pg_net` → `enviar-push` → payload `aes128gcm` firmado con VAPID → `201` del servicio de push.

- **Los tres `sw*.js` viven en `/public`, no en `/src`.** El navegador identifica al worker por su URL; si el bundle le pusiera un hash al nombre, cada deploy instalaría un worker nuevo en vez de actualizar el que ya está. El precio es que `oxlint` y `tsc` no los miran: son los únicos archivos del proyecto sin red de seguridad.
- **El worker solo se registra en el build de producción.** En `pnpm dev`, Vite sirve cada módulo por separado y un worker que cachea deja al navegador mostrando código viejo. Se prueba con `pnpm build && pnpm preview`, que corre en localhost y por lo tanto es contexto seguro: instalación y push funcionan igual que en Vercel.
- **Nada de Supabase se cachea.** Solo el cascarón (`index.html`, iconos, logo) y los `/assets/*` con hash. Este dashboard dice quién debe plata: servir una respuesta vieja de la API como si fuera de ahora es peor que no abrir.
- **El trigger `pagos_avisan` nunca levanta una excepción.** Cuelga de un `INSERT` en `pagos`, así que un `raise exception` —por ejemplo por un secreto faltante— impediría guardar el pago. Todo es `raise warning`, y hasta el `net.http_post` va dentro de un bloque `exception when others`. Quedarse sin aviso es molesto; perder el registro de plata que entró es el peor bug posible.
- **`verify_jwt` no protege a `enviar-push`.** Acepta cualquier JWT del proyecto, y la publishable key es uno de ellos: viaja en el bundle que descarga el navegador. La función decodifica el bearer y exige `role = service_role`. Lee el payload **sin** verificar la firma, y eso solo vale porque el gateway ya la verificó: si se apaga `verify_jwt`, el chequeo deja de valer. **No sirve comparar contra `SUPABASE_SERVICE_ROLE_KEY`** — en producción ese valor no es el mismo que el trigger saca de Vault, y la función le devolvía 401 a su propia base.
- **Una suscripción muerta se borra sola.** Si el servicio de push contesta 404 o 410 —desinstalaron la app, limpiaron el navegador, revocaron el permiso—, `enviar-push` borra la fila. Por eso no hay botón de "desactivar": el interruptor real está en los ajustes del navegador y la base se entera al siguiente pago.
- **Regenerar las llaves VAPID invalida todas las suscripciones.** Los navegadores quedan suscritos con la llave vieja y el servicio rechaza lo firmado con la nueva. Rotarlas obliga a vaciar `suscripciones_push` y pedir permiso de nuevo en cada dispositivo.
- **En iPhone el push solo existe si la app está instalada** en la pantalla de inicio (iOS 16.4+). Por eso `index.html` lleva los `apple-mobile-web-app-*`: iOS ignora el manifest.
- **El permiso se pide con un clic, nunca al cargar.** Un navegador que recibe el pedido sin que nadie lo haya tocado lo bloquea de por vida, y ese "no" no se puede deshacer desde la página.
**Esto ya corre en producción.** El dashboard vive en Vercel (HTTPS), `config.enviar_push_url` apunta al proyecto real y `suscripciones_push` tiene una fila: hay un dispositivo suscrito de verdad.

Lo que **todavía no se vio pasar** es un aviso entregado en producción de punta a punta, y no por un fallo: desde que el push se desplegó no ha entrado ningún pago (el último es del 2026-09-14). El camino se verificó en local el 2026-09-15 y el primer pago real lo estrenará.

El orden del despliegue, para cuando haya que rehacerlo, fue:

```bash
supabase db push                                    # crea suscripciones_push y el trigger
supabase functions deploy enviar-push
node scripts/generar-vapid.mjs                      # UNA vez, y guardar la salida
supabase secrets set VAPID_CONTACTO=... VAPID_KEYS='...'
```

Y tres cosas a mano, que ningún comando hace:
1. `VITE_VAPID_PUBLIC_KEY` en las variables de entorno de Vercel — sin ella el aviso de activar no aparece siquiera, a propósito.
2. `update config set valor = '"https://<ref>.supabase.co/functions/v1/enviar-push"' where clave = 'enviar_push_url';` — el valor que trae la migración apunta a la red de Docker.
3. El secreto `service_role_key` en Vault ya existe si el cron de correo funciona; el trigger usa ese mismo.

- **La escala del icono maskable (0.8) es aritmética, no gusto.** Android recorta un círculo del 80% del lado; el dibujo del logo (500×500, fondo negro) va del 21% al 82%, y a 0.8 su esquina más lejana queda a 0.34 del centro, dentro del radio 0.4. Más grande y el recorte le come el texto.
- **Cambiar el logo = subir `CACHE` en `sw-cache.js`.** Si no, el teléfono con la app instalada sigue mostrando el viejo desde la caché.

## Trampas del entorno, ya verificadas

Todas están explicadas en `docs/referencia/entorno.md` — leelo antes de pelear con una de estas.

- **`.claude/worktrees/` contiene worktrees de OTRO repositorio**, con sus propios tests y componentes React. Vitest y oxlint están acotados por eso: `test.include` explícito en `vite.config.ts` y `oxlint src` por argumento de CLI (`ignorePatterns` en `.oxlintrc.json` no surtió efecto sobre esos directorios). Si `pnpm test` reporta más archivos de los esperados, es esto.
- `supabase start` con "Intento de acceso a un socket no permitido" en el 54322: WinNAT se reservó el rango de puertos de Supabase. Se arregla con `net stop winnat; net start winnat` en una PowerShell de administrador.
- `tsc -b` no acepta `--noEmit`, y `baseUrl` está deprecado en TS 6: el alias `@/*` funciona solo con `paths`.
- `Intl.NumberFormat("es-CR")` separa los miles con **U+00A0**, no con un espacio normal. En la salida de un test fallido se ven idénticos.
- Tailwind v4 resetea `border: 0 solid` **sin color**, así que un `className="border"` pelado hereda `currentColor` y pinta casi negro. Todo borde necesita su color explícito.
- Dentro de una Edge Function **no existe** `SUPABASE_SECRET_KEY` — el prefijo `SUPABASE_` está reservado. Se usa `SUPABASE_SERVICE_ROLE_KEY`. Con el nombre equivocado la función ni arranca y el cliente solo ve un `WORKER_ERROR` 500; el motivo real está en el log de `functions serve`.
- Toda Edge Function exige JWT salvo que se diga lo contrario, y WooCommerce no manda ese header: hace falta `verify_jwt = false` en `supabase/config.toml` **y** `--no-verify-jwt` al servir en local (`serve` no lee `config.toml`). El endpoint queda público, y eso es aceptable solo porque la firma HMAC lo autentica dentro de la función.
- La CLI trata `supabase/functions/_*` como código compartido, no como función: servirla devuelve `Function not found` sin explicación.
- **`config.toml` no configura la nube.** El registro público se cierra desde el dashboard (Authentication → Sign In / Providers → Email). No usar `supabase config push`: empuja también `site_url = http://127.0.0.1:5173` y rompe los enlaces de los correos en producción.
- En `config.toml` hay tres `enable_signup`. Solo el de `[auth]` cierra el registro; el de `[auth.email]` apaga el proveedor de email **entero, login incluido**. Se comprueba con dos llamadas: `signup` debe dar `signup_disabled` y `token?grant_type=password` debe devolver un `access_token`.

## Documentación

| Carpeta | Qué contiene | Cuándo |
|---|---|---|
| `docs/specs/` | Qué construimos y por qué, con la justificación de cada decisión | Antes de cambiar el diseño |
| `docs/plans/` | Cómo construirlo, tarea por tarea, con comandos exactos. Cada tarea es autocontenida | Al implementar |
| `docs/referencia/` | Hechos verificados del entorno real, comportamiento de la tienda, convenciones | Cuando algo no cuadra |

**⚠️ IMPORTANTE: cada módulo o tarea desarrollada se documenta y actualiza sus `.md` en el mismo cambio.** Sin docs al día la tarea no está terminada. Qué archivo tocar según el cambio: tabla "IMPORTANTE: todo lo que se desarrolla se documenta" en `docs/README.md`. Al cerrar, `grep` en `docs/` por lo que cambió y corregir toda frase que quedó vieja ("todavía no", "pendiente", "sin desplegar").

Las restricciones cerradas con el cliente están en `docs/specs/02-restricciones.md` y **no se re-litigan sin hablar con él**. Lo que todavía está abierto, en `09-pendientes.md`: nada de la Fase B se puede empezar sin correos reales del banco (D1, D5).

**Estado:** Fases A, B, C y D **desplegadas en producción** el 2026-09-14. El ciclo corre solo: `pg_cron` cada 5 minutos → Vault → `net.http_post` → `correo-poll` → IMAP sobre TLS → `correos_banco` → `pagos` → matcher → `conciliaciones`.

Verificado en la nube, no en local: `correo-poll` responde 200 con `{"revisados":50,"extraido":39,"no-aplica":11,"sin-extraer":0}` en ~15 s, y la base tiene el histórico del buzón entrando a razón de 50 correos por corrida.

**La IP de las Edge Functions no está bloqueada por cPHulk.** Era el riesgo que no se podía descartar sin probar: la función sale desde AWS y no desde la máquina de Jason. Funcionó al primer intento contra `mail.organicocr.store:993`.

**El frontend también está desplegado**, en https://organico-cr-dashboard.vercel.app/. Backend y dashboard corren los dos en producción.

Fase B en curso. Hecho: esquema (`correos_banco`, `pagos` inmutable, `config`), sección "Pagos" con navegación, el extractor de Davibank, la Edge Function `correo-poll` (IMAP sobre TLS, `EXAMINE`) y el job de `pg_cron` cada 5 minutos. Verificado de punta a punta contra un Greenmail local: cron → `net.http_post` → función → IMAP sobre TLS → `correos_banco` → `pagos`, con idempotencia y reinicio de cursor probados. Greenmail no es Dovecot: ver las diferencias en `docs/referencia/entorno.md`.

**El respaldo LLM ya existe** (`correo-poll/extraer-con-llm.ts`), desplegado el 2026-09-21. Solo corre cuando `extraerPago` devuelve `desconocido`, que sobre los 313 correos del buzón real pasa cero veces: el regex sigue siendo el camino normal y en condiciones normales no se gasta nada. El pago queda con `metodo_extraccion = 'llm'` y `MetodoBadge` lo pinta en ámbar — varias filas ámbar seguidas significan que el banco cambió la plantilla.

- **El modelo no calcula el monto.** Devuelve la cifra copiada literal del aviso y la convierte `normalizarMontoCRC`, el mismo que usa el regex. Pedirle la multiplicación agregaría una clase de error —₡3 777,42 en vez de ₡377 742,05— que ningún test de este repo atraparía.
- **Tres frenos antes de registrar plata:** confianza < 0.9 → no se guarda nada; moneda distinta de CRC → se descarta con motivo (el banco avisa ingresos en dólares con la misma redacción); monto ilegible → tira y el correo queda para revisar.
- **Nada de esto puede cortar el ingest.** Sin `ANTHROPIC_API_KEY` el respaldo no existe y el poll corre como antes; si la llamada falla, el correo queda como quedaba. Por eso en local no hace falta la clave.
- **El tope de 8 llamadas por corrida es por el timeout del cron**, no por costo: el cursor solo avanza si la corrida entera termina, y 50 correos ilegibles de golpe reintentarían lo mismo cada 5 minutos sin avanzar nunca.
- **`structured outputs` rechaza `minimum`/`maximum` en un `number`** (`For 'number' type, properties maximum, minimum are not supported`). El rango de la confianza se acota en código, porque `pagos.confianza_extraccion` tiene un check `between 0 and 1` y un 1.5 haría fallar el insert entero.
- **El SDK se importa dinámicamente** (`await import("npm:@anthropic-ai/sdk")`, con `import type` para los tipos). Estático, obligaría a resolver el paquete al cargar el módulo y `procesar-correo.test.ts` —que corre en vitest, no en Deno— dejaría de arrancar. Por lo mismo, la clave se lee con `globalThis.Deno?.env`.

El extractor del BAC (D5) también está hecho.

**`correo-poll` ya corre contra el buzón real.** La credencial quedó buena tras cambiar la contraseña del buzón desde cPanel (`organicocr.store:2096`); antes se había cambiado por error la de cPanel, que es otra. Verificado el 2026-09-14 de punta a punta contra producción, en solo lectura: 100 correos capturados, 64 pagos extraídos, cursor avanzando y `ya-estaba` al releer, sin un solo duplicado.

Lo que enseñó el buzón real, y que ninguna prueba con Greenmail podía anticipar:

- **Davibank manda tres redacciones de ingreso, no una.** Además del SINPE Móvil ya conocido, están "Recepción de pago inmediato" (`por un monto de 51,175.44 CRC`, moneda detrás) y "Recepción de transferencia SINPE" (`por un monto de CRC 377,742.05`, moneda delante). El extractor conocía solo la primera y perdía **8 de 17 ingresos de la muestra**, uno de ₡377 742. Las tres viven en `_extractor/plantillas-davibank.ts`.
- **Los montos vienen en formato anglosajón** — `2,412.01`: coma para miles, punto para decimales. La descripción del dueño decía lo contrario (`12.036,00`). `normalizarMontoCRC` ya decidía por la cantidad de dígitos tras el último separador, así que aguantó sin cambios.
- **El monto no puede terminar en separador.** Con `[\d.,]+` el patrón se tragaba el punto final de la oración (`CRC 1,000,000.00.`) y el normalizador rechazaba la cifra entera: el aviso se perdía sin dejar rastro. Va `[\d.,]*\d`.
- **La moneda escrita es obligatoria en el patrón.** Davibank avisa ingresos en dólares con la misma redacción (`un monto de 500.00 USD`); leerlos como colones los haría cuadrar con el pedido equivocado.
- **Davibank sí manda el motivo del pago** ("Verduras -87138944", "Cafe", "Pago Compra 20260911"), al final del aviso de SINPE Móvil. El código decía que no lo mandaba. Es lo que más ayuda al matcher, porque **el nombre viene truncado a 20 caracteres** y con guiones bajos por espacios (`MARIELLA_LO_VEGA`, `DISTRIBUIDORA_AGROPE`): el matcher tiene que comparar por similitud, nunca por igualdad.
- **El buzón tiene 13 015 mensajes y más de 1 700 avisos del banco.** Con el cursor en cero, la primera corrida intentaba bajarlos todos, se pasaba del timeout y —como el cursor solo se guarda si nada falla— reintentaba lo mismo cada 5 minutos sin avanzar nunca. De ahí `LOTE_MAXIMO` en `index.ts`.
- **D5 cerrado.** El remitente del BAC es `notificaciones@baccredomatic.cr` y su extractor está escrito. Cuatro redacciones, y lo único que separa un cobro de un pago propio es el verbo de la cuenta: `acreditando la cuenta` / `recibió una transferencia` entran, `debitando su cuenta` no. **El BAC no dice quién mandó la plata** — el único nombre del aviso es el del titular, o sea el propio dueño, así que `remitente_nombre` va en null y lo que identifica el pago es el concepto (`LAGUNAS AGRICOLA`, `FACT 7277 7282`). Sin nombre el matcher llega como mucho a 0.75: esos pagos siempre pasan por "Revisar". Quedan fuera a propósito `Alertas@davibank.cr` (inicios de sesión) y `facturaelectronica@baccredomatic.cr` (gastos).

- **Un correo descartado no es un correo ilegible**, y hasta el 2026-09-14 los dos caían en `procesado_ok = false`. El dashboard avisaba "47 correos sin procesar" cuando los 47 estaban correctamente descartados —egresos y avisos en dólares—, y un aviso siempre encendido deja de avisar. Ahora `extraerPago` devuelve tres clases (`pago` | `no-aplica` | `desconocido`), el motivo queda en `correos_banco.motivo_sin_pago`, y `procesado_ok = false` significa una sola cosa: nadie supo leerlo. Sobre 57 correos reales: 32 pagos, 25 descartados con motivo, **0 sin reconocer**.

- **Lo que hay que descartar antes de buscar un cobro:** `Envío exitoso de…` y `Recepción de débito…` (Davibank), `debitando su cuenta` (BAC), cualquier monto en dólares, y `Devolución de crédito directo Entrante` — esa última trae un monto en CRC con la misma forma que un cobro ("El crédito directo #… por un monto de 29,236.00 CRC fue devuelto"), así que sin descartarla explícitamente registraría plata que nunca entró.

**El correo del banco no está en Gmail.** `info@organicocr.store` es un Dovecot de cPanel en Bluehost y se lee por IMAP en solo lectura (`EXAMINE`). La restricción R2 se corrigió con el hecho verificado; el porqué está en `docs/referencia/entorno.md`. Los avisos llegan de `servicioalcliente@davibank.cr` y también del BAC, cuyo formato sigue sin conocerse (D5).

**Fase C implementada** (matcher SQL), sin UI todavía. `conciliaciones` con los dos índices únicos parciales que imponen el 1:1 de R5, `candidatos_de_pago` (puntúa, no escribe) y `conciliar_pago` (decide y escribe), disparadas por trigger desde `pagos` y desde `pedidos`. Pesos y umbrales en `config`. Pruebas en `supabase/tests/matcher.sql` — `pnpm test:sql`.

Tres frenos antes de auto-confirmar, y los tres existen porque los errores no son simétricos: confirmar de más esconde plata sin cobrar para siempre, quedarse corto solo pone una fila en "Revisar".
1. Sin monto exacto no se confirma nunca, por alto que dé el resto.
2. Si el segundo candidato queda a menos de `margen_desempate` del primero, se sugiere: dos pedidos del mismo monto el mismo día son una moneda al aire.
3. El patrón de la referencia usa bordes de palabra (`\m`/`\M`), si no el "69" de un pedido daría positivo dentro de "1069".
4. **Solo confirma lo que el banco probadamente mandó** (`20260923173544`): `metodo_extraccion = 'regex'` y `dmarc=pass` en la primera `Authentication-Results` del correo. Un pago leído por el LLM o un correo sin esa cabecera queda en `sugerido`. **Hoy el servidor de cPanel no escribe esa cabecera** (0 de 7 correos desde el 2026-09-16), así que **ningún pago se auto-confirma: todos pasan por "Revisar"**. Para volver a la auto-confirmación hay que lograr que el buzón agregue `Authentication-Results` con DMARC, no relajar este freno: sin él, un SINPE Móvil falsificado con el `From` exacto de Davibank se cobraba solo.

**Techo real del score para pagos de empresa: 0.80.** Las plantillas de transferencia SINPE y pago inmediato no traen motivo escrito por quien paga, solo el número de referencia del banco, así que el término de 0.20 nunca se activa y nunca llegan al umbral de 0.85. Caen siempre en "Revisar". Solo los pagos por SINPE Móvil pueden auto-confirmarse, porque ahí sí viaja el motivo. Si se quiere que las empresas también se concilien solas, hay que subir `peso_monto` — es una decisión de riesgo del dueño, no del código.

**Fase D: "Revisar" y "Pagaron" implementadas.** El dashboard tiene cuatro secciones —Deben, Revisar, Pagaron, Pagos— sin react-router: sigue sin haber enlaces que compartir, y lo que lo justificaría es querer volver a una sección tras recargar, no la cantidad.

El recorrido de un pedido: entra en **Deben** (`pendiente`), el matcher encuentra un pago y lo manda a **Revisar** (`revisar`) o directo a **Pagaron** (`pagado`) si auto-confirmó. En Revisar hay dos botones; confirmar lo cobra, descartar lo devuelve a Deben —salvo que otra sugerencia siga viva, porque un pedido sin candidatos no puede quedarse donde nadie lo mira—.

Confirmar y descartar pasan por `resolver_conciliacion(uuid, boolean)` y no por dos updates desde el cliente: marcar el pedido `pagado` y que después el índice único rechace la conciliación dejaría un cobro sin pago que lo respalde. Es la **única** función del proyecto con `grant execute ... to authenticated`; como es `security definer` y salta RLS, verifica `auth.uid()` a mano. Sin sesión devuelve `permission denied for function`.

"Pagaron" hace `left join` contra las conciliaciones a propósito: un pedido puede estar `pagado` sin pago del banco detrás —marcado a mano, o llegado de Woo ya en `completed`— y esconderlo haría que el dueño lo buscara donde ya no está. Esos salen como "marcado a mano".
