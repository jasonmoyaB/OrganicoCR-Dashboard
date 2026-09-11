« [Fase A](README.md)

# 01 · Scaffold del proyecto

**Produce:** proyecto Vite + React + TS + Tailwind v4 corriendo, con alias `@` y scripts de npm.

**Files:** todo el scaffold de Vite en la raíz del proyecto.

**Ya existen en la raíz, no los toques:** `.gitignore`, `.env.local` (con las credenciales de WooCommerce ya cargadas) y `.env.example`.

- [ ] **Step 1: Verificar que `.gitignore` protege los secretos ANTES de inicializar git**

```bash
cd "C:/Users/jason/OneDrive/Documents/OrganicoCR-Dashboard"
grep -q "^\.env\.local$" .gitignore && echo "OK: .env.local protegido" || echo "PELIGRO: falta .env.local en .gitignore"
```

Expected: `OK: .env.local protegido`. Si dice PELIGRO, agregarlo antes de seguir — `.env.local` contiene las credenciales reales de la tienda.

- [ ] **Step 2: Inicializar git**

```bash
git init
git add docs/ .gitignore .env.example
git commit -m "docs: spec y plan de Fase A"
```

Confirmar que `.env.local` quedó afuera:

```bash
git status --porcelain --ignored | grep "\.env\.local"
```

Expected: `!! .env.local` — las dos admiraciones significan "ignorado". Si aparece con `??` o `A `, está a punto de commitearse: parar y arreglar `.gitignore`.

- [ ] **Step 3: Scaffold de Vite en la raíz**

Vite se niega a scaffoldear sobre un directorio que ya tiene archivos, así que se genera aparte y se mueve.

**El `.gitignore` del scaffold NO se copia encima del nuestro** — el nuestro ya cubre todo lo de Vite más los secretos. Copiarlo perdería la protección de `.env.local`:

```bash
pnpm create vite@latest .tmp-scaffold --template react-ts
cp -r .tmp-scaffold/* .
rm -rf .tmp-scaffold
pnpm install
```

`cp -r .tmp-scaffold/*` no incluye archivos que empiezan con punto, así que el `.gitignore` de Vite queda fuera solo. Igual conviene verificar:

```bash
grep -c "env.local" .gitignore
```

Expected: `2` o más.

- [ ] **Step 4: Verificar que el scaffold corre**

Run: `pnpm dev`
Expected: arranca en `http://localhost:5173` y muestra la página por defecto de Vite. Cortar con Ctrl+C.

- [ ] **Step 5: Instalar dependencias**

```bash
pnpm add @supabase/supabase-js @tanstack/react-query
pnpm add -D vitest @testing-library/react @testing-library/jest-dom jsdom @types/node
pnpm add tailwindcss @tailwindcss/vite
```

- [ ] **Step 6: Configurar Tailwind v4**

Reemplazar todo `src/index.css` con:

```css
@import "tailwindcss";
```

Reemplazar todo `vite.config.ts` con:

```ts
import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  test: {
    environment: "jsdom",
    globals: true,
  },
});
```

Borrar `src/App.css` — Tailwind reemplaza esos estilos.

- [ ] **Step 7: Configurar el alias `@` en TypeScript**

Agregar dentro de `compilerOptions` en `tsconfig.app.json`:

```json
"baseUrl": ".",
"paths": { "@/*": ["./src/*"] }
```

Agregar el mismo bloque dentro de `compilerOptions` en `tsconfig.node.json`, para que `vite.config.ts` lo resuelva.

- [ ] **Step 8: Scripts de `package.json`**

Reemplazar el bloque `"scripts"` con:

```json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "preview": "vite preview",
  "typecheck": "tsc -b --noEmit",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 9: Verificar typecheck**

Run: `pnpm typecheck`
Expected: sin salida, exit code 0.

- [ ] **Step 10: Commit**

```bash
git add -A
git status --short | grep "\.env\.local" && echo "PARAR: .env.local está staged" || git commit -m "chore: scaffold Vite + React + TS + Tailwind v4"
```

El chequeo intermedio existe porque `git add -A` es indiscriminado y `.env.local` tiene credenciales reales de la tienda. Si imprime `PARAR`, revisar `.gitignore` antes de commitear.

---

« [Fase A](README.md) · [02 · Utils →](02-utils.md)
