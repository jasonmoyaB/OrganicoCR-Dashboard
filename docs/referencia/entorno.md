« [Índice](../README.md)

# Entorno de desarrollo

Hechos verificados en la máquina de desarrollo el **2026-09-11**, al ejecutar las tareas 01 y 02.

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

## Git: el repositorio ya existía

Tiene remoto en `https://github.com/jasonmoyaB/OrganicoCR-Dashboard.git` y dos commits previos con skills en `.agents/`.

**El remoto importa para los secretos:** `.gitignore` cubre `.env.local`, que tiene las credenciales reales de la tienda. Verificar antes de cualquier `git add -A`:

```bash
git status --porcelain --ignored | grep "\.env\.local"
```

Debe imprimir `!! .env.local` — las dos admiraciones significan "ignorado".

## El scaffold de Vite pisa el README.md de la raíz

`cp -r .tmp-scaffold/* .` sobrescribe `README.md` con el de Vite. Si ya había uno, se pierde. Restaurarlo con `git restore README.md`.

## Línea de fin CRLF

Git avisa `LF will be replaced by CRLF` en cada archivo. Es el comportamiento normal de `core.autocrlf` en Windows, no un problema.

---

« [Índice](../README.md) · [Tienda WooCommerce](tienda-woocommerce.md) · [Convenciones](convenciones.md)
