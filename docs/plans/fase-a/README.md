« [Planes](../README.md) · [Índice](../../README.md)

# Fase A — Pedidos visibles

> **Para agentes:** SUB-SKILL REQUERIDA — usar `superpowers:subagent-driven-development` (recomendado) o `superpowers:executing-plans`. **Una tarea = un archivo = una sesión.** Los pasos usan checkbox (`- [ ]`) para seguimiento.

**Goal:** el dueño de OrganicoCR entra al dashboard y ve sus pedidos pendientes reales de WooCommerce, con el monto total que le deben.

**Architecture:** flujo unidireccional. WooCommerce entra por webhook y por backfill; nunca se le escribe. Postgres es la fuente de verdad del estado de pago. Frontend por capas estrictas.

**Tech Stack:** React 19 · TypeScript 6 · Vite 8 · Tailwind v4 · TanStack Query v5 · Vitest 5 · oxlint · Supabase · pnpm

## Antes de empezar

Leer, en este orden:

1. [`referencia/convenciones.md`](../../referencia/convenciones.md) — capas, nombres, límites
2. [`referencia/tienda-woocommerce.md`](../../referencia/tienda-woocommerce.md) — cómo se comporta la tienda real
3. [`specs/03-principios.md`](../../specs/03-principios.md) — las reglas que no se negocian

No hace falta leer el spec completo. Cada tarea de abajo es autocontenida.

## Requisitos del entorno

- Node 22+ y pnpm (verificado con Node 24.12 y pnpm 10.33 — ver [entorno](../../referencia/entorno.md))
- Docker Desktop corriendo (lo necesita `supabase start`)
- Supabase CLI: `pnpm add -g supabase`
- Credenciales de WooCommerce de **solo lectura** — necesarias a partir de la tarea 11

## Orden de ejecución

Es secuencial. Cada tarea asume que las anteriores están hechas y commiteadas.

| # | Tarea | Produce |
|---|---|---|
| 01 | [Scaffold](01-scaffold.md) | Proyecto Vite + TS + Tailwind corriendo |
| 02 | [Utils puras](02-utils.md) | `formatColones`, `diasTranscurridos`, `montoACentimos` · 13 tests |
| 03 | [Migración](03-migracion.md) | Tablas, RLS, `upsert_pedido`, `search_path` fijo |
| 04 | [Cliente Supabase](04-cliente-supabase.md) | Cliente tipado, tipos generados, env tipadas |
| 05 | [Autenticación](05-auth.md) | Login con usuario único |
| 06 | [Datos de pedidos](06-pedidos-datos.md) | Tipos + service · 2 tests |
| 07 | [Hook](07-pedidos-hook.md) | `usePedidosPendientes` |
| 08 | [Componentes](08-pedidos-componentes.md) | Tarjeta, fila, tabla — render puro |
| 09 | [Página "Deben"](09-pedidos-pagina.md) | Pantalla funcionando con datos |
| 10 | [Mapeo de WooCommerce](10-mapeo-woo.md) | `mapearPedidoWoo`, `estadoPagoInicial` · 10 tests |
| 11 | [Backfill](11-backfill.md) | Pedidos históricos en la base |
| 12 | [Webhook](12-webhook.md) | Edge Function con HMAC · 4 tests |
| 13 | [Despliegue](13-despliegue.md) | Producción funcionando |

## Por qué ese orden

**Auth (05) antes que la tabla (09):** con RLS deny-all, sin sesión la UI lee vacío. Construir la tabla primero significaría depurar una pantalla en blanco sin saber si el problema es RLS, el fetch o los datos.

**Backfill (11) antes que webhook (12):** el backfill llena la base en minutos. El webhook obliga a esperar a que entre un pedido nuevo. Datos reales primero, UI contra datos de verdad y no contra mocks.

**Utils (02) primero:** son las únicas piezas sin dependencias. Tests rápidos, sin mocks, sin infraestructura.

## Archivos que produce la fase

| Archivo | Responsabilidad |
|---|---|
| `src/lib/supabase.ts` | Cliente Supabase singleton |
| `src/lib/query-client.ts` | Configuración de TanStack Query |
| `src/types/database.types.ts` | Generado por la CLI. No se edita |
| `src/utils/format-colones.ts` | Céntimos → texto en colones. Pura |
| `src/utils/dias-transcurridos.ts` | Fecha ISO → días desde entonces. Pura |
| `src/utils/monto-a-centimos.ts` | String de Woo → entero en céntimos. Pura |
| `src/constants/estados-pago.ts` | Valores de `estado_pago` |
| `src/features/auth/hooks/use-sesion.ts` | Estado de sesión |
| `src/features/auth/components/login-form.tsx` | UI de login |
| `src/features/pedidos/types/pedido.types.ts` | Interfaces del dominio |
| `src/features/pedidos/services/pedidos-service.ts` | Queries + mapeo de filas |
| `src/features/pedidos/hooks/use-pedidos-pendientes.ts` | Query + mutación |
| `src/features/pedidos/components/total-pendiente-card.tsx` | Resumen. Render puro |
| `src/features/pedidos/components/pedido-row.tsx` | Fila. Render puro |
| `src/features/pedidos/components/pedidos-deben-table.tsx` | Tabla. Render puro |
| `src/features/pedidos/components/pedidos-deben-page.tsx` | Compone hook + componentes |
| `supabase/migrations/*_fase_a_pedidos.sql` | Tablas, índices, RLS, `upsert_pedido` |
| `supabase/functions/woo-webhook/index.ts` | Recibe webhook, valida, llama al RPC |
| `supabase/functions/woo-webhook/mapear-pedido.ts` | Payload Woo → fila. Pura |
| `supabase/functions/woo-webhook/verificar-firma.ts` | HMAC-SHA256. Pura |
| `scripts/backfill-woo.ts` | Import histórico, una sola corrida |

## Criterio de cierre

- [ ] `pnpm typecheck` sin errores
- [ ] `pnpm test` verde — **29 tests en 6 archivos**
- [ ] `supabase db reset` aplica limpio
- [ ] La sección "Deben" muestra los 3 pedidos pendientes reales, total **₡33 845**
- [ ] Un pedido nuevo en la tienda aparece en el dashboard sin intervención
- [ ] Reenviar el mismo webhook no duplica filas
- [ ] Un `order.updated` de Woo no revierte un pedido ya marcado pagado
- [ ] Cancelar un pedido en Woo lo saca de "Deben"
- [ ] Sin sesión, la publishable key devuelve `[]` sobre `pedidos`
- [ ] Marcar pagado en el dashboard no altera nada en WooCommerce

## Fuera de alcance

Lectura de correo, extracción de pagos, conciliación automática y las secciones "Revisar" y "Pagaron" son Fases B, C y D. No adelantar nada de eso: el algoritmo de matching se calibra con datos reales que todavía no existen.

Los dos únicos ganchos hacia adelante, y ambos cuestan cero hoy: `estado_pago` ya acepta `'revisar'` en el check constraint, y `PEDIDOS_PENDIENTES_KEY` ya se exporta para invalidación externa.

---

« [Planes](../README.md) · [01 · Scaffold →](01-scaffold.md)
