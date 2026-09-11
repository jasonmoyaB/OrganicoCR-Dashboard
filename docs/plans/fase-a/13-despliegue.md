« [Fase A](README.md)

# 13 · Despliegue

**Produce:** Fase A funcionando en producción, con el webhook de la tienda real apuntando al endpoint.

**Files:**
- Create: `vercel.json`

- [x] **Step 1: Crear el proyecto en Supabase Cloud**

Crear el proyecto desde el dashboard de Supabase, luego:

```bash
supabase link --project-ref <PROJECT_REF>
supabase db push
```

Expected: las migraciones de Fase A se aplican en la nube.

- [x] **Step 2: Crear el usuario de producción**

Repetir el `POST /auth/v1/admin/users` de la [tarea 05](05-auth.md) contra la URL de la nube, con una contraseña real y fuerte — **no** la de desarrollo. Va al gestor de contraseñas, no al repo ni a `.env.local`.

`scripts/crear-usuario-dev.mjs` **no sirve acá**: aborta a propósito si `SUPABASE_URL` no es local, justamente para no crear cuentas reales con credenciales de desarrollo.

- [x] **Step 2b: Cerrar el registro público en la nube**

**`enable_signup = false` de `config.toml` no aplica a la nube.** Ese archivo gobierna el stack local; el proyecto en la nube viene con el registro abierto, y ni `db push` ni `functions deploy` lo cambian.

Mientras siga abierto, cualquiera puede crear una cuenta con la publishable key que viaja en el bundle, y la policy de `pedidos` deja leer a cualquier `authenticated`: vería todos los datos de los clientes.

```
Authentication → Sign In / Providers → Email → "Allow new users to sign up" → apagado
```

**No cerrarlo con `supabase config push`**: empuja toda la config local, `site_url = http://127.0.0.1:5173` incluido, y rompe los enlaces de los correos en producción.

Verificación, en [entorno](../../referencia/entorno.md): un `POST /auth/v1/signup` debe devolver `signup_disabled`. Probarlo con una dirección `@example.com` no vale — Supabase la rechaza por el dominio antes de mirar si el registro está abierto, y da un falso "cerrado".

- [x] **Step 3: Desplegar la Edge Function**

```bash
supabase secrets set WOO_WEBHOOK_SECRET=<SECRETO_FUERTE_REAL>
supabase functions deploy woo-webhook --no-verify-jwt
```

Generar el secreto con:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

`--no-verify-jwt` es necesario: WooCommerce no manda un JWT de Supabase. La autenticación de este endpoint es la firma HMAC, que ya se verifica dentro de la función.

- [x] **Step 4: Registrar el webhook en WooCommerce**

En WP Admin → WooCommerce → Ajustes → Avanzado → **Webhooks**, crear **dos** webhooks:

| Campo | Valor |
|---|---|
| Estado | Activo |
| Tema | `Pedido creado` en uno, `Pedido actualizado` en el otro |
| URL de entrega | `https://<PROJECT_REF>.supabase.co/functions/v1/woo-webhook` |
| Secreto | el mismo `WOO_WEBHOOK_SECRET` del Step 3 |
| Versión de API | WP REST API Integration v3 |

- [x] **Step 5: Configurar Vercel**

`vercel.json`:

```json
{
  "buildCommand": "pnpm build",
  "outputDirectory": "dist",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

El rewrite es necesario para que recargar cualquier ruta que no sea `/` no devuelva 404 en una SPA.

- [ ] **Step 6: Desplegar**

```bash
pnpm vercel --prod
```

Cargar `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` con los valores del proyecto en la nube, en Vercel → Settings → Environment Variables. **Redesplegar después de agregarlas** — Vite las inyecta en build time, no en runtime.

- [x] **Step 7: Correr el backfill contra producción**

Apuntar `SUPABASE_URL` y `SUPABASE_SECRET_KEY` en `.env.local` al proyecto en la nube y correr:

```bash
pnpm backfill
```

Las credenciales de WooCommerce son las mismas: la tienda es una sola, no hay versión de staging.

Mejor que editar `.env.local` y acordarse de revertirlo: dejarlo intacto y pasar un segundo archivo. Node aplica los `--env-file` en orden y el último gana.

```bash
# un archivo temporal con SUPABASE_URL y SUPABASE_SECRET_KEY de producción
npx tsx --env-file=.env.local --env-file=<temporal>.env scripts/backfill-woo.ts
```

Las credenciales de WooCommerce siguen saliendo de `.env.local`: la tienda es una sola, no hay versión de staging. Borrar el archivo temporal al terminar.

La primera línea que imprime el script es el destino. Leerla antes de seguir.

- [ ] **Step 8: Verificación de extremo a extremo**

1. Abrir la URL de Vercel → aparece el login
2. Entrar con las credenciales de producción → se ven los pedidos reales
3. Crear un pedido de prueba en la tienda → aparece en "Deben" en menos de un minuto
4. "Marcar pagado" → desaparece de la lista
5. **Confirmar que el pedido de prueba NO cambió de estado en WooCommerce.** Esa es la garantía de [P1](../../specs/03-principios.md): el dashboard no toca la tienda

- [ ] **Step 9: Verificación final**

```bash
pnpm typecheck
pnpm test
supabase db reset
```

Expected: los tres sin errores. `pnpm test` debe reportar **38 tests en 8 archivos**.

- [x] **Step 10: Commit**

```bash
git add vercel.json
git commit -m "chore: configuración de despliegue en Vercel"
```

- [x] **Step 11: Cerrar la fase**

Repasar el [criterio de cierre](README.md#criterio-de-cierre) completo antes de dar la Fase A por terminada.

---

« [12 · Webhook](12-webhook.md) · [Fase A](README.md)
