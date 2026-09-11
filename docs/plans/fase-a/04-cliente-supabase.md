« [Fase A](README.md)

# 04 · Cliente Supabase y tipos generados

**Produce:** cliente tipado y `database.types.ts`.

**Files:**
- Modify: `.env.local` (ya existe, con las claves vacías listas para completar)
- Create: `src/lib/supabase.ts`
- Create: `src/types/database.types.ts` (generado)
- Create: `src/types/env.d.ts`

- [x] **Step 1: Completar las variables de Supabase**

`.env.local` ya existe en la raíz con la estructura completa y las credenciales de WooCommerce cargadas. Solo hay que rellenar cuatro valores con lo que imprimió `supabase start` en la [tarea 03](03-migracion.md):

```
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SECRET_KEY=sb_secret_...
```

Las dos primeras las lee el navegador; las dos últimas, los scripts de Node. Misma URL, distinta key — y ese es el punto.

Supabase reemplazó las claves `anon` / `service_role` (JWT que empezaban con `eyJ...`) por **Publishable** y **Secret**, con los prefijos `sb_publishable_` y `sb_secret_`. La correspondencia es directa: publishable donde antes iba anon, secret donde antes iba service_role.

Las claves del stack local son valores compartidos por defecto, iguales en todas las máquinas. No son secretas y no sirven contra la nube.

**La secret key nunca va en un archivo `VITE_*`.** Todo lo que empiece con `VITE_` termina dentro del bundle de JavaScript que descarga el navegador. Por eso `SUPABASE_SECRET_KEY` va sin prefijo.

`.env.example` ya existe con la misma estructura, sin valores. Si agregás una variable nueva a `.env.local`, agregala también ahí.

- [x] **Step 2: Generar los tipos de la base**

```bash
supabase gen types typescript --local > src/types/database.types.ts
```

Expected: el archivo contiene `export type Database = {` con `pedidos` y `webhook_eventos`.

Este archivo se regenera con ese mismo comando cada vez que cambia el esquema. Editarlo a mano garantiza que la próxima regeneración borre el cambio.

- [x] **Step 3: Crear el cliente**

`src/lib/supabase.ts`:

```ts
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !publishableKey) {
  throw new Error(
    "Faltan VITE_SUPABASE_URL o VITE_SUPABASE_PUBLISHABLE_KEY. Copiá .env.example a .env.local.",
  );
}

export const supabase = createClient<Database>(url, publishableKey);
export type SupabaseClienteApp = typeof supabase;
```

- [x] **Step 4: Tipar las variables de entorno**

`vite/client` declara `ImportMetaEnv` con una index signature `any`. Sin este archivo, `url` y `publishableKey` entran al código como `any` y el typecheck no detecta un nombre de variable mal escrito.

Vite 8 no genera `src/vite-env.d.ts`: el scaffold pone `"types": ["vite/client"]` en `tsconfig.app.json`. La interfaz se extiende por merge de declaración.

`src/types/env.d.ts`:

```ts
/// <reference types="vite/client" />

// `vite/client` declara ImportMetaEnv con index signature `any`. Sin este
// merge, `import.meta.env.VITE_SUPABASE_URL` entra al código como `any`.
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

Se comprueba con una prueba negativa: asignar `import.meta.env.VITE_SUPABASE_URL` a un `number` debe dar `error TS2322: Type 'string' is not assignable to type 'number'`. Si compila, sigue siendo `any`.

- [x] **Step 5: Verificar typecheck**

Run: `pnpm typecheck`
Expected: sin errores.

- [x] **Step 6: Commit**

```bash
git add src/lib src/types
git commit -m "feat: cliente Supabase tipado"
```

---

« [03 · Migración](03-migracion.md) · [05 · Autenticación →](05-auth.md)
