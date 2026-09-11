« [Fase A](README.md)

# 13 · Despliegue

**Produce:** Fase A funcionando en producción, con el webhook de la tienda real apuntando al endpoint.

**Files:**
- Create: `vercel.json`

- [ ] **Step 1: Crear el proyecto en Supabase Cloud**

Crear el proyecto desde el dashboard de Supabase, luego:

```bash
supabase link --project-ref <PROJECT_REF>
supabase db push
```

Expected: las migraciones de Fase A se aplican en la nube.

- [ ] **Step 2: Crear el usuario de producción**

Repetir el curl de la [tarea 05](05-auth.md) contra la URL del proyecto en la nube, con una contraseña real y fuerte — **no** la de desarrollo.

Confirmar en el dashboard que Authentication → Providers → Email tiene **"Enable signup" desactivado**.

- [ ] **Step 3: Desplegar la Edge Function**

```bash
supabase secrets set WOO_WEBHOOK_SECRET=<SECRETO_FUERTE_REAL>
supabase functions deploy woo-webhook --no-verify-jwt
```

Generar el secreto con:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

`--no-verify-jwt` es necesario: WooCommerce no manda un JWT de Supabase. La autenticación de este endpoint es la firma HMAC, que ya se verifica dentro de la función.

- [ ] **Step 4: Registrar el webhook en WooCommerce**

En WP Admin → WooCommerce → Ajustes → Avanzado → **Webhooks**, crear **dos** webhooks:

| Campo | Valor |
|---|---|
| Estado | Activo |
| Tema | `Pedido creado` en uno, `Pedido actualizado` en el otro |
| URL de entrega | `https://<PROJECT_REF>.supabase.co/functions/v1/woo-webhook` |
| Secreto | el mismo `WOO_WEBHOOK_SECRET` del Step 3 |
| Versión de API | WP REST API Integration v3 |

- [ ] **Step 5: Configurar Vercel**

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

- [ ] **Step 7: Correr el backfill contra producción**

Apuntar `SUPABASE_URL` y `SUPABASE_SECRET_KEY` en `.env.local` al proyecto en la nube y correr:

```bash
pnpm backfill
```

Las credenciales de WooCommerce son las mismas: la tienda es una sola, no hay versión de staging.

**Acordate de devolver `SUPABASE_URL` y `SUPABASE_SECRET_KEY` a los valores locales** cuando vuelvas a desarrollar, o el próximo `pnpm backfill` escribirá en producción sin avisar.

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

- [ ] **Step 10: Commit**

```bash
git add vercel.json
git commit -m "chore: configuración de despliegue en Vercel"
```

- [ ] **Step 11: Cerrar la fase**

Repasar el [criterio de cierre](README.md#criterio-de-cierre) completo antes de dar la Fase A por terminada.

---

« [12 · Webhook](12-webhook.md) · [Fase A](README.md)
