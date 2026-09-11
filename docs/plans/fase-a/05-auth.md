« [Fase A](README.md)

# 05 · Autenticación

**Produce:** login funcionando con un único usuario, y la puerta de sesión en `App.tsx`.

Va antes de la tabla de pedidos: con RLS deny-all, sin sesión la UI lee vacío. Construir la tabla primero significaría depurar una pantalla en blanco sin saber si el problema es RLS, el fetch o los datos.

Por qué el usuario vive en Supabase Auth y no en el código: [seguridad](../../specs/06-seguridad.md).

**Files:**
- Create: `src/features/auth/services/auth-service.ts`
- Create: `src/features/auth/hooks/use-sesion.ts`
- Create: `src/features/auth/hooks/use-login-form.ts`
- Create: `src/features/auth/components/login-form.tsx`
- Create: `src/lib/query-client.ts`
- Create: `scripts/crear-usuario-dev.mjs`
- Modify: `src/App.tsx`, `src/main.tsx`, `supabase/config.toml`, `package.json`, `.env.local`, `.env.example`

## Las capas

`signInWithPassword` **no** va dentro del componente. Tres archivos, tres responsabilidades:

```
auth-service.ts    → habla con Supabase. Sin estado, sin UI.
use-login-form.ts  → estado del formulario y del envío. Sin JSX.
login-form.tsx     → render. No sabe que Supabase existe.
```

- [x] **Step 1: Cerrar el registro público**

`config.toml` tiene tres claves llamadas `enable_signup`. Solo la de `[auth]` cierra el registro:

```toml
[auth]
enable_signup = false

[auth.email]
enable_signup = true    # NO tocar
```

La CLI mapea `[auth.email].enable_signup` a `GOTRUE_EXTERNAL_EMAIL_ENABLED`. Ponerla en `false` apaga el proveedor de email **entero**, y el login devuelve:

```
{"code":422,"error_code":"email_provider_disabled","msg":"Email logins are disabled"}
```

De paso, apuntar las URLs al puerto de Vite:

```toml
site_url = "http://127.0.0.1:5173"
additional_redirect_urls = ["http://127.0.0.1:5173"]
```

Aplicar con `supabase stop && supabase start`. `config.toml` se lee al arrancar los contenedores, no en caliente.

- [x] **Step 2: Crear el usuario único**

Agregar a `.env.local` (no se commitea):

```
DEV_LOGIN_EMAIL=info@organicocr.store
DEV_LOGIN_PASSWORD=...
```

`scripts/crear-usuario-dev.mjs` hace el `POST /auth/v1/admin/users` con la secret key y `email_confirm: true`. Es idempotente: si el usuario ya existe responde `email_exists` y sale con 0.

Aborta si `SUPABASE_URL` no contiene `127.0.0.1` ni `localhost`. Escribe usuarios con la secret key, y apuntarlo a la nube por accidente crearía una cuenta real con una contraseña de desarrollo.

En `package.json`:

```json
"usuario:dev": "node --env-file=.env.local scripts/crear-usuario-dev.mjs"
```

Run: `pnpm usuario:dev`
Expected: `Usuario creado: info@organicocr.store`

**`supabase db reset` borra `auth.users`.** Después de cada reset hay que volver a correr `pnpm usuario:dev`, o el login devuelve `invalid_credentials` sin que nada en el código haya cambiado.

- [x] **Step 3: Servicio de autenticación**

`src/features/auth/services/auth-service.ts`:

```ts
import { supabase } from "@/lib/supabase";

interface Credenciales {
  email: string;
  password: string;
}

export async function iniciarSesion(credenciales: Credenciales): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword(credenciales);
  if (error) throw error;
}

export async function cerrarSesion(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
```

- [x] **Step 4: Hook de sesión**

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

    const { data } = supabase.auth.onAuthStateChange((_evento, sesionNueva) =>
      setSesion(sesionNueva),
    );

    return () => data.subscription.unsubscribe();
  }, []);

  return { sesion, cargando };
}
```

`getSession()` resuelve el arranque; `onAuthStateChange` mantiene el estado al entrar y al salir. Sin el `unsubscribe` del cleanup, cada montaje deja una suscripción viva.

- [x] **Step 5: Hook del formulario**

`src/features/auth/hooks/use-login-form.ts`:

```ts
import { useState, type FormEvent } from "react";
import { iniciarSesion } from "../services/auth-service";

// Genérico a propósito: distinguir "ese correo no existe" de "contraseña
// incorrecta" le confirma a un atacante qué correos son válidos.
const MENSAJE_CREDENCIALES_INVALIDAS = "Correo o contraseña incorrectos.";

export function useLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function manejarSubmit(evento: FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);

    try {
      await iniciarSesion({ email, password });
    } catch {
      setError(MENSAJE_CREDENCIALES_INVALIDAS);
    } finally {
      setEnviando(false);
    }
  }

  return { email, setEmail, password, setPassword, error, enviando, manejarSubmit };
}
```

- [x] **Step 6: Formulario**

`src/features/auth/components/login-form.tsx` — render puro. Consume `useLoginForm()` y no importa `supabase`. Dos inputs controlados, el error en rojo, y el botón deshabilitado mientras `enviando`.

Los `autoComplete` son `username` y `current-password`, para que el gestor de contraseñas del navegador ofrezca guardarlas.

- [x] **Step 7: Configurar TanStack Query**

`src/lib/query-client.ts`:

```ts
import { QueryClient } from "@tanstack/react-query";

const SEGUNDOS_FRESCOS = 30_000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: SEGUNDOS_FRESCOS,
      refetchOnWindowFocus: true,
    },
  },
});
```

`src/main.tsx` envuelve `<App />` en `<QueryClientProvider client={queryClient}>`.

- [x] **Step 8: Puerta de autenticación**

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

  return <div className="p-8 text-neutral-900">Sesión iniciada.</div>;
}
```

- [x] **Step 9: Verificar contra la API**

Antes del navegador, porque aísla el backend del frontend.

Hacen falta **las dos** llamadas. Mirar solo el signup da un falso verde: con el proveedor de email apagado, el signup también falla, y parecería que todo está bien.

| Llamada | Esperado |
|---|---|
| `POST /auth/v1/signup` | `signup_disabled` |
| `POST /auth/v1/token?grant_type=password` | un `access_token` |
| `GET /rest/v1/pedidos` con ese token | `[]`, no un error de permisos |

La tercera es la prueba de que la policy de `authenticated` sobre `pedidos` funciona.

- [ ] **Step 10: Verificar en el navegador**

Run: `pnpm dev`

1. Aparece el formulario de login
2. Credenciales incorrectas → "Correo o contraseña incorrectos."
3. Credenciales del Step 2 → "Sesión iniciada."
4. Recargar la página → sigue adentro (la sesión persiste en localStorage)

Si Vite reporta `Port 5173 is in use`, usar el puerto que imprima.

- [x] **Step 11: Commit**

```bash
git add src/ scripts/ supabase/config.toml package.json .env.example
git commit -m "feat(auth): login con usuario unico y puerta de sesion"
```

---

« [04 · Cliente Supabase](04-cliente-supabase.md) · [06 · Datos de pedidos →](06-pedidos-datos.md)
