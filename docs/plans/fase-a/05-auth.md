« [Fase A](README.md)

# 05 · Autenticación

**Produce:** login funcionando con un único usuario, y la puerta de sesión en `App.tsx`.

Va antes de la tabla de pedidos: con RLS deny-all, sin sesión la UI lee vacío. Construir la tabla primero significaría depurar una pantalla en blanco sin saber si el problema es RLS, el fetch o los datos.

Por qué el usuario vive en Supabase Auth y no en el código: [seguridad](../../specs/06-seguridad.md).

**Files:**
- Create: `src/features/auth/hooks/use-sesion.ts`
- Create: `src/features/auth/components/login-form.tsx`
- Create: `src/lib/query-client.ts`
- Modify: `src/App.tsx`, `src/main.tsx`

- [ ] **Step 1: Crear el usuario único**

```bash
curl -X POST "http://127.0.0.1:54321/auth/v1/admin/users" \
  -H "apikey: <SERVICE_ROLE_KEY>" \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"email":"dueno@organicocr.store","password":"CAMBIAR_ANTES_DE_PRODUCCION","email_confirm":true}'
```

Expected: JSON con el `id` del usuario creado.

Agregar a `supabase/config.toml`, bajo `[auth]`, para cerrar el registro público:

```toml
enable_signup = false
```

- [ ] **Step 2: Hook de sesión**

`src/features/auth/hooks/use-sesion.ts`:

```ts
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export function useSesion() {
  const [sesion, setSesion] = useState<Session | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSesion(data.session);
      setCargando(false);
    });

    const { data: subscripcion } = supabase.auth.onAuthStateChange(
      (_evento, sesionNueva) => setSesion(sesionNueva),
    );

    return () => subscripcion.subscription.unsubscribe();
  }, []);

  return { sesion, cargando };
}
```

- [ ] **Step 3: Formulario de login**

`src/features/auth/components/login-form.tsx`:

```tsx
import { useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function manejarSubmit(evento: FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);

    const { error: errorAuth } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (errorAuth) setError("Correo o contraseña incorrectos.");
    setEnviando(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50">
      <form
        onSubmit={manejarSubmit}
        className="w-full max-w-sm space-y-4 rounded-lg border bg-white p-8 shadow-sm"
      >
        <h1 className="text-xl font-semibold">OrganicoCR</h1>

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Correo"
          required
          className="w-full rounded border px-3 py-2"
        />

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Contraseña"
          required
          className="w-full rounded border px-3 py-2"
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={enviando}
          className="w-full rounded bg-green-700 py-2 text-white disabled:opacity-50"
        >
          {enviando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
```

El mensaje de error es genérico a propósito. Distinguir "ese correo no existe" de "contraseña incorrecta" le confirma a un atacante qué correos son válidos.

- [ ] **Step 4: Configurar TanStack Query**

`src/lib/query-client.ts`:

```ts
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: true,
    },
  },
});
```

`src/main.tsx`:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
```

- [ ] **Step 5: Puerta de autenticación**

Reemplazar todo `src/App.tsx`:

```tsx
import { LoginForm } from "@/features/auth/components/login-form";
import { useSesion } from "@/features/auth/hooks/use-sesion";

export default function App() {
  const { sesion, cargando } = useSesion();

  if (cargando) {
    return <div className="p-8 text-neutral-500">Cargando…</div>;
  }

  if (!sesion) {
    return <LoginForm />;
  }

  return <div className="p-8">Sesión iniciada.</div>;
}
```

- [ ] **Step 6: Verificar a mano**

Run: `pnpm dev`

En el navegador:

1. Aparece el formulario de login
2. Credenciales incorrectas → "Correo o contraseña incorrectos."
3. Credenciales del Step 1 → "Sesión iniciada."
4. Recargar la página → sigue adentro (la sesión persiste en localStorage)

- [ ] **Step 7: Commit**

```bash
git add src/
git commit -m "feat(auth): login con usuario único y puerta de sesión"
```

---

« [04 · Cliente Supabase](04-cliente-supabase.md) · [06 · Datos de pedidos →](06-pedidos-datos.md)
