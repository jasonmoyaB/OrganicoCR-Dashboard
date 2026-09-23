# Contexto del proyecto — OrganicoCR Dashboard

Dashboard de conciliación de pagos para la tienda WooCommerce de OrganicoCR.
Cruza los pagos que llegan por correo del banco contra los pedidos de la tienda
y muestra quién debe y quién pagó. **Un solo usuario (el dueño), sin SSR, sin roles.**

Esto mueve plata real. Un falso positivo esconde un cobro pendiente para siempre;
un falso negativo solo genera una fila en "Revisar". Los errores **no son simétricos**
y las reglas de este directorio existen por eso.

## Stack

React 19 · TypeScript 6 · Vite 8 · Tailwind v4 · TanStack Query v5 ·
Supabase (Postgres + Edge Functions en Deno + `pg_cron` + Vault) · Vercel estático.
Alias `@/*` → `src/*`. Gestor de paquetes: **pnpm y nada más** (el repo tiene
`pnpm-lock.yaml` únicamente). Un PR que introduzca `package-lock.json` o
`yarn.lock` está mal.

## Arquitectura — tres flujos independientes que convergen en Postgres

```
WooCommerce --webhook HMAC--> [woo-webhook] --> upsert_pedido --> pedidos ------+
info@ (IMAP) --pg_cron 5min--> [correo-poll] --> correos_banco --> pagos --> [matcher SQL] --> conciliaciones
                                                                               |
React + TanStack Query <-- supabase-js + RLS <---------------------------------+
                                                                               |
pagos --trigger--> [enviar-push] --Web Push--> el teléfono del dueño <----------+
```

Ninguno de los tres necesita a los otros para funcionar. Un cambio que acople
dos flujos (p. ej. que el webhook dependa del matcher) rompe esa propiedad.

## Mapa del repo

| Ruta | Qué hay |
|---|---|
| `src/features/<nombre>/{components,hooks,services,types}` | auth, pedidos, pagos, conciliaciones, notificaciones |
| `src/{lib,utils,constants,types}` | lo transversal |
| `src/types/database.types.ts` | **generado** por la CLI de Supabase; editarlo a mano se pierde |
| `supabase/migrations/` | una migración = un cambio atómico |
| `supabase/functions/` | `woo-webhook`, `correo-poll`, `enviar-push`, `_auth`, `_extractor` |
| `public/sw*.js` | service workers — fuera del alcance de `tsc` y `oxlint` |
| `docs/specs/` · `docs/plans/` · `docs/referencia/` | qué y por qué · cómo · hechos del entorno |

## Comandos que deben pasar antes de aprobar

```bash
pnpm typecheck     # tsc -b
pnpm lint          # oxlint src
pnpm test          # vitest run
pnpm test:sql      # pruebas del matcher (requiere el stack local)
supabase db reset  # las migraciones aplican de cero
```

## Estado

Fases A–D desplegadas en producción desde el 2026-09-14. El backend corre solo.
**El frontend todavía no está en Vercel**, así que nada que dependa de HTTPS
público (instalación del PWA, push real) se puede verificar en producción aún.
