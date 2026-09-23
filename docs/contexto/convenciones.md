# Convenciones

## Idioma

**Todo en español**: código, nombres, comentarios, mensajes de error, commits. `cliente_nombre`, no `customer_name`. Las únicas excepciones son las palabras del dominio ajeno (`completed`, `refunded`, `webhook`).

## Capas y dirección de las dependencias

```
components/  render. sin fetch, sin lógica de negocio
hooks/       estado y efectos. sin JSX
services/    acceso a datos. sin estado, sin UI
utils/       funciones puras. sin imports de framework
types/ constants/   sin lógica

components → hooks → services → utils        components → types / constants
```

Un componente no importa de otro componente de otra feature. Lo transversal vive en la raíz de `src/`.

**Dos excepciones reales:**
- `public/sw*.js` es JavaScript pelado fuera del bundle (el navegador identifica al worker por su URL). `oxlint` y `tsc` no los miran.
- Las Edge Functions **no importan de `src/`**: el bundler del deploy no sigue imports fuera de `supabase/functions/`. Por eso `enviar-push/mensaje-pago.ts` duplica el formateo de colones — si cambia el formato, hay que tocar los dos.

## Nombres

| Qué | Patrón | Ejemplo real |
|---|---|---|
| Archivo | kebab-case | `pedido-row.tsx`, `use-sesion.ts` |
| Componente | PascalCase, sustantivo | `PedidoRow`, `TotalPendienteCard` |
| Hook | `use` + sustantivo | `usePedidosPendientes`, `useNotificacionesPush` |
| Service | verbo + sustantivo | `fetchPedidosPorEstado`, `resolverConciliacion` |
| Función pura | verbo descriptivo | `formatColones`, `diasTranscurridos` |
| Constante | UPPER_SNAKE_CASE | `ESTADO_PAGO`, `LOTE_MAXIMO`, `DIAS_ALERTA` |
| Función SQL | snake_case, verbo | `upsert_pedido`, `conciliar_pago`, `resolver_conciliacion` |

Las enumeraciones son objetos `as const` + tipo derivado, no `enum`:

```ts
export const ESTADO_PAGO = { PENDIENTE: "pendiente", ... } as const;
export type EstadoPago = (typeof ESTADO_PAGO)[keyof typeof ESTADO_PAGO];
```

## Límites

150 líneas por archivo · 30 por función · ≤3 parámetros · ≤3 niveles de indentación · ≤5 props.

## Patrones que usamos

- **El mapeo `snake_case` → `camelCase` ocurre una sola vez, en el service** (`mapearPedido`, `mapearPago`, `mapearSugerencia`). Ningún componente ve un `cliente_nombre`.
- **Validación al mapear**: un `estado_pago` o un `metodo_extraccion` desconocido lanza error con el identificador de la fila adentro (`esEstadoPago`, `esMetodoExtraccion` como type guards).
- **Columnas explícitas en los `select`, nunca `*` cuando hay datos sensibles**: así `cuerpo_correo` nunca sale de la base (ver `pagos-service.ts` + `PagoRow` como `Pick<...>`).
- **Los errores de Supabase se re-lanzan con contexto en español**: `throw new Error("No se pudieron cargar los pedidos: " + error.message)` (con template literal en el código real).
- **Query keys exportadas** desde el hook (`PEDIDOS_PENDIENTES_KEY`) para que otra feature pueda invalidarlas.
- **Los valores derivados viven en el hook**, no en el componente (p. ej. `totalCentimos` en `usePedidosPendientes`).
- **Clases de Tailwind largas como constantes de módulo** (`CLASE_BOTON`, `CLASE_ANTIGUEDAD`), con tokens del tema: `bosque`, `crema`, `tinta`, `apagado`, `borde`, `alerta`, `ambar` (`@theme` en `src/index.css`).
- **Los comentarios explican el porqué, no el qué.** Es la marca de casa: casi todo comentario del repo justifica una decisión o documenta algo verificado contra el mundo real.
- **En SQL: `security definer` + `set search_path = public, pg_temp`** y los **dos** revokes (`from public` y `from anon, authenticated`).

## Patrones prohibidos

- `npm`, `npx`, `yarn`. **Solo pnpm.**
- Montos en punto flotante. Todo es `bigint` en céntimos.
- Editar `src/types/database.types.ts` a mano (lo regenera la CLI).
- Editar una migración ya aplicada.
- `VITE_` sobre cualquier secreto. La secret key nunca lleva ese prefijo.
- Confiar en el frontend para proteger datos: la protección vive en RLS.
- Dos updates desde el cliente donde hace falta atomicidad (por eso existe `resolver_conciliacion`).
- `border` pelado en Tailwind v4: siempre con color explícito.
- `raise exception` dentro del trigger `pagos_avisan`: tumbaría el insert del pago.

## Tests

- Vitest, `environment: "node"`, `include` explícito (`src/**/*.test.ts` y `supabase/functions/**/*.test.ts`) porque `.claude/worktrees/` tiene tests de otro repo.
- **El test vive al lado del archivo que prueba**: `format-colones.ts` + `format-colones.test.ts`.
- Hoy hay 33 archivos de test: 11 en `src/utils`, 3 en services, 1 en `src/lib`, 18 en Edge Functions. **Los componentes y los hooks no se testean.**
- Las funciones que dependen del reloj reciben `ahora` como parámetro con default.
- Las pruebas del matcher son SQL: `supabase/tests/matcher.sql` vía `pnpm test:sql`.

## Commits

Conventional commits en español, minúscula, sin punto final, con el ámbito del dominio:

```
feat(pagos): filtro por fecha
fix(correo): las tres redacciones reales de Davibank
docs: fases A a D desplegadas y corriendo solas en produccion
chore(correo): verificador de la credencial IMAP
```

Ámbitos vistos: `pagos`, `correo`, `pedidos`, `woo`, `conciliacion`, `dashboard`. El asunto describe **el efecto**, no el archivo tocado. Algunos commits recientes se salen de la convención (`refresco automatico`, `notificaciones and pwa`); la convención es la de arriba.

Ramas: `main` es la principal; el trabajo va en ramas por tema (`pwa`, `notificaciones`, `Design`, `fase-b-correo-poll`) y entra por PR. **No hay CI**: el repo no tiene `.github/workflows`, así que los checks se corren a mano antes de abrir el PR.
