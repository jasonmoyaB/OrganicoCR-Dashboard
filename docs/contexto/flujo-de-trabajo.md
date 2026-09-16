# Flujo de trabajo

**pnpm siempre.** El repo tiene `pnpm-lock.yaml` y nada más. Nunca `npm` / `npx` / `yarn`.

## Puesta en marcha

```bash
pnpm install
cp .env.example .env.local     # completar con los valores de abajo
supabase start                 # imprime la URL y las claves del stack local
pnpm usuario:dev               # crea el usuario del dashboard
pnpm dev                       # puede NO usar el 5173: leer el puerto real de la salida
```

## Hacer un cambio

1. **Rama desde `main`**, por tema (`pwa`, `notificaciones`, …). El trabajo entra por PR.
2. **Leer antes de escribir**: `docs/referencia/convenciones.md` para las reglas, `docs/specs/03-principios.md` si el cambio toca el dominio. Las restricciones cerradas con el cliente están en `docs/specs/02-restricciones.md` y **no se re-litigan sin hablar con él**.
3. **Ubicar el archivo por capa**, no por conveniencia: `components → hooks → services → utils`. Lo transversal en la raíz de `src/`, lo demás en `src/features/<nombre>/`.
4. **Si toca la base**: una migración **nueva** (`supabase migration new <nombre>`), un cambio atómico. Nunca editar una aplicada. Toda función nueva lleva `security definer`, `set search_path = public, pg_temp` y los **dos** revokes.
5. **Si cambia el esquema**: regenerar los tipos.
   ```bash
   supabase gen types typescript --local > src/types/database.types.ts
   ```
6. **Tests primero en funciones puras y de ingest** (TDD): el test vive al lado del archivo.
7. **Si toca los `sw*.js` de `/public`**: revisar a mano. `oxlint` y `tsc` no los miran.
8. **Si toca el formateo de montos**: hay dos copias — `src/utils/format-colones.ts` y `supabase/functions/enviar-push/mensaje-pago.ts`. Las Edge Functions no pueden importar de `src/`.

## Comandos

```bash
pnpm dev · pnpm build · pnpm preview
pnpm typecheck        # tsc -b  (sin --noEmit: -b no lo acepta)
pnpm lint             # oxlint src  (el directorio por CLI, a propósito)
pnpm test             # vitest run
pnpm exec vitest run src/utils/format-colones.test.ts
pnpm exec vitest run -t "lanza error ante texto no numérico"
pnpm test:sql         # matcher y resolver_conciliacion, contra el Postgres local en Docker
```

Supabase local:

```bash
supabase db reset      # recrea la base LOCAL. Borra auth.users -> después: pnpm usuario:dev
supabase db push       # aplica migraciones a la NUBE. Suma, no destruye
supabase functions serve woo-webhook --env-file supabase/functions/.env --no-verify-jwt
pnpm backfill          # pedidos históricos de Woo (lee .env.local)
pnpm imap:probar       # verifica la credencial del buzón
```

## Checklist de "terminado"

Sin excepción, antes de dar algo por terminado:

- [ ] `pnpm typecheck` sin errores
- [ ] `pnpm test` verde
- [ ] `supabase db reset` aplica limpio (si no se puede correr, **documentar el bloqueo**)
- [ ] `pnpm test:sql` verde, si se tocó el matcher o las conciliaciones
- [ ] `pnpm dlx react-doctor@latest --verbose` en 100/100 (las supresiones van en `doctor.config.json` con su evidencia en `.react-doctor/false-positives.md`)
- [ ] Si se tocó el PWA: `pnpm build && pnpm preview` y probarlo en un navegador con ventana — en `pnpm dev` el worker no se registra
- [ ] `git status --porcelain --ignored` antes de cualquier `git add -A`: confirmar que `.env.local` sigue ignorado

No hay CI: **estos checks se corren a mano.**

## Commits

Conventional commits en español, minúscula, describiendo el efecto:

```
feat(pagos): filtro por fecha
fix(correo): que un update fallido no dé la corrida por buena
docs: fases A a D desplegadas y corriendo solas en produccion
```

## Deploy

**Backend — ya corre en producción.** Orden cuando hay cambios:

```bash
supabase db push
supabase functions deploy woo-webhook | correo-poll | enviar-push
```

Y lo que ningún comando hace: los secretos (`supabase secrets set ...`), el secreto `service_role_key` en Vault (`select vault.create_secret(...)`, una vez por entorno) y ajustar `config` para que las URLs apunten a la nube y no a la red de Docker:

```sql
update config set valor = '"https://<ref>.supabase.co/functions/v1/enviar-push"' where clave = 'enviar_push_url';
update config set valor = '"https://<ref>.supabase.co/functions/v1/correo-poll"'  where clave = 'correo_poll_url';
```

**Frontend — todavía no desplegado.** `vercel.json` ya está listo (build estático, rewrite a `index.html`, `Content-Type` del manifest). Cuando se despliegue hace falta, además, `VITE_VAPID_PUBLIC_KEY` en las variables de entorno de Vercel: sin ella la franja de activar notificaciones no aparece, a propósito.

Una vez, no en cada build:

```bash
node scripts/generar-vapid.mjs                                        # par VAPID. Rotarlo invalida TODAS las suscripciones
powershell -ExecutionPolicy Bypass -File scripts/generar-iconos.ps1    # regenera public/icons desde el logo
```

## Lo que no se hace nunca

- **`supabase db reset --linked`** — apunta a la nube y borra todo lo que haya ahí. A la nube solo `db push`.
- **`supabase config push`** — empuja `site_url = http://127.0.0.1:5173` y rompe los enlaces de los correos en producción. La config de la nube se cambia desde el dashboard de Supabase.
- **Descomentar las credenciales de producción en `.env.local`** — hace que `pnpm backfill` escriba en la base real. El backfill no tiene la red de seguridad que sí tiene `crear-usuario-dev.mjs`.
- Editar una migración ya aplicada, o `src/types/database.types.ts` a mano.
