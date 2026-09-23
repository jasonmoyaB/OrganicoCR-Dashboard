# Seguridad — lo que hay que buscar en cada PR

Hallazgos verificados contra la base real, no teoría. Todos estos ya ocurrieron
una vez en este repo.

## Secretos y bundle

- **Todo lo que empiece con `VITE_` termina dentro del bundle que descarga el
  navegador.** Ahí solo van la URL de Supabase y la publishable key. La secret key
  (`sb_secret_...`) **nunca** lleva ese prefijo. Un `VITE_` nuevo en un PR exige
  preguntarse si puede ser público.
- `.env.local` tiene credenciales reales de la tienda y está en `.gitignore`.
  Un PR que lo incluya, o que hardcodee una credencial, se bloquea.
- La protección real vive en **RLS**, no en el frontend. Ocultar un botón no es
  una medida de seguridad.

## Funciones SQL — los DOS revokes, no uno

Postgres otorga `EXECUTE` a `PUBLIC` en toda función nueva, y Supabase además
otorga `EXECUTE` **nominal** a `anon` y `authenticated` por default privileges del
esquema `public`. Revocar de `PUBLIC` no toca esos grants nominales; revocar solo
de `anon, authenticated` deja el de `PUBLIC`. **Hacen falta las dos líneas:**

```sql
revoke execute on function mi_funcion(uuid) from public;
revoke execute on function mi_funcion(uuid) from anon, authenticated;
```

Verificado el 2026-09-14: con solo el revoke de `PUBLIC`,
`POST /rest/v1/rpc/conciliar_pago` con la publishable key devolvía **204** — la
función `security definer` corría para cualquiera que abriera el bundle.

**Una función nueva sin los dos revokes es un bloqueo.** Se comprueba en la base,
que es la única fuente fiable:

```sql
select proname, array_to_string(proacl, ',') from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and prosecdef;   -- solo postgres y service_role
```

Cómo distinguir los fallos al verificar:
`permission denied for function` = el revoke funciona ·
`new row violates row-level security policy` = la función corrió y solo RLS la
detuvo · `PGRST202` con 404 = **ambiguo**, puede ser la firma del argumento y no
el permiso; no sirve como prueba.

## Otras reglas de SQL

- **Toda función nueva necesita `search_path` fijo**: `public, pg_temp`, con
  `pg_temp` **al final**. Si va primero, una tabla temporal ajena le gana a la real.
- Toda policy exige `auth.uid() is not null`. Una policy **no puede limitar
  columnas**: eso es privilegio de columna (`grant update (estado_pago)`).
- `webhook_eventos` con RLS activo y **cero policies** es intencional: deny-all,
  solo la secret key lee. No "arreglarlo" agregando una policy.
- `resolver_conciliacion` es la **única** función del proyecto con
  `grant execute ... to authenticated`. Como es `security definer` y salta RLS,
  verifica `auth.uid()` a mano. Un segundo grant a `authenticated` en otra función
  necesita justificación explícita en el PR.
- Entrada de usuario dentro de un patrón regex va **escapada** (ver
  `20260916141500_corregir_escapar_regex.sql`).

## Edge Functions

- Dentro de una Edge Function **no existe** `SUPABASE_SECRET_KEY` — el prefijo
  `SUPABASE_` está reservado. Se usa `SUPABASE_SERVICE_ROLE_KEY`. Con el nombre
  equivocado la función ni arranca y el cliente solo ve un `WORKER_ERROR` 500.
- Toda Edge Function exige JWT salvo que se diga lo contrario. `woo-webhook`
  necesita `verify_jwt = false` en `supabase/config.toml` **y** `--no-verify-jwt`
  al servir en local. Queda público, y eso es aceptable **solo** porque la firma
  HMAC lo autentica dentro de la función. Quitar la verificación HMAC es un bloqueo.
- **`verify_jwt` no protege a `enviar-push`**: acepta cualquier JWT del proyecto,
  y la publishable key es uno de ellos. La función decodifica el bearer y exige
  `role = service_role`. Lee el payload **sin** verificar la firma, y eso solo vale
  porque el gateway ya la verificó. **No sirve comparar contra
  `SUPABASE_SERVICE_ROLE_KEY`**: en producción ese valor no es el mismo que el
  trigger saca de Vault, y la función le devolvía 401 a su propia base.
- La CLI trata `supabase/functions/_*` como código compartido, no como función.

## Triggers que cuelgan de un INSERT de plata

**El trigger `pagos_avisan` nunca levanta una excepción.** Cuelga de un `INSERT`
en `pagos`, así que un `raise exception` —por ejemplo por un secreto faltante—
impediría guardar el pago. Todo es `raise warning`, y hasta el `net.http_post` va
dentro de un bloque `exception when others`. Quedarse sin aviso es molesto;
perder el registro de plata que entró es el peor bug posible. **Un `raise
exception` nuevo en ese camino es un bloqueo.**

## `config.toml` no configura la nube

El registro público se cierra desde el dashboard (Authentication → Sign In /
Providers → Email). **No usar `supabase config push`**: empuja también
`site_url = http://127.0.0.1:5173` y rompe los enlaces de los correos en producción.
De los tres `enable_signup`, solo el de `[auth]` cierra el registro; el de
`[auth.email]` apaga el proveedor de email **entero, login incluido**.

## Comandos destructivos

**Nunca `supabase db reset --linked`** — apunta a la nube y borra todo lo que haya
ahí. A la nube solo se le hace `db push`, que suma y no destruye.
