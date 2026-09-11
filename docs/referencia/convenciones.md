« [Índice](../README.md)

# Convenciones del proyecto

Leer antes de escribir cualquier archivo.

## Capas

```
components/  → render. sin fetch, sin lógica de negocio, sin acceso a datos
hooks/       → estado y efectos. sin JSX
services/    → acceso a datos. sin estado, sin UI
utils/       → funciones puras. sin efectos, sin imports de framework
types/       → interfaces y tipos. sin lógica
constants/   → valores fijos. sin funciones
```

Dirección de las dependencias, nunca al revés:

```
components → hooks → services → utils
components → types / constants
```

Un componente no importa de otro componente de otra feature.

## Estructura de una feature

```
src/features/<nombre>/
  components/
  hooks/
  services/
  types/
```

Lo transversal vive en la raíz de `src/`: `lib/`, `utils/`, `constants/`, `types/`.

## Nombres

| Qué | Patrón | Ejemplo |
|---|---|---|
| Componente | PascalCase, sustantivo | `PedidoRow`, `TotalPendienteCard` |
| Hook | `use` + sustantivo | `usePedidosPendientes`, `useSesion` |
| Función de service | verbo + sustantivo | `fetchPedidosPorEstado`, `marcarPedidoPagado` |
| Función pura | verbo descriptivo | `formatColones`, `diasTranscurridos` |
| Constante | UPPER_SNAKE_CASE | `ESTADO_PAGO`, `DIAS_ALERTA` |
| Tipo / interface | PascalCase | `Pedido`, `EstadoPago` |
| Archivo | kebab-case | `pedido-row.tsx`, `use-sesion.ts` |

El código va en español, igual que el dominio. `cliente_nombre`, no `customer_name`.

## Límites

| Qué | Límite | Si lo superás |
|---|---|---|
| Líneas por archivo | 150 | Dividir por responsabilidad |
| Líneas por función | 30 | Extraer subfunciones |
| Parámetros | 3 | Pasar un objeto |
| Niveles de indentación | 3 | Early return |
| Props por componente | 5 | Agrupar o dividir el componente |

## Base de datos

- Columnas en `snake_case`. El dominio TypeScript en `camelCase`. **El mapeo ocurre una sola vez, en el service.** Ningún componente ve nunca un `cliente_nombre`.
- Montos como `bigint` en céntimos. Nunca punto flotante — el matching compara por igualdad exacta y el float lo rompe de forma intermitente e irreproducible.
- Una migración = un cambio atómico. **Nunca editar una migración ya aplicada.**
- `src/types/database.types.ts` se genera con la CLI. Editarlo a mano garantiza que la próxima regeneración borre el cambio.

```bash
supabase gen types typescript --local > src/types/database.types.ts
```

## Secretos

- Todo lo que empiece con `VITE_` **termina dentro del bundle que descarga el navegador**. Ahí solo van la URL de Supabase y la publishable key.
- La secret key (`sb_secret_...`) nunca lleva prefijo `VITE_`. Solo la usan scripts locales y Edge Functions.
- La protección real vive en RLS, no en el frontend.

## Tests

- Vitest. Los tests viven al lado del archivo que prueban: `format-colones.ts` + `format-colones.test.ts`.
- Las funciones que dependen del reloj reciben `ahora` como parámetro con default. Tests deterministas sin mockear el reloj global.
- TDD en las funciones puras y en las de ingest: test primero, verlo fallar, implementar, verlo pasar.

## Criterio de corrección

Sin excepción, antes de dar algo por terminado:

```bash
pnpm typecheck     # sin errores
pnpm test          # verde
supabase db reset  # migraciones aplican limpio
```

Si no podés correr `db reset` localmente, documentá el bloqueo antes de seguir.

---

« [Tienda WooCommerce](tienda-woocommerce.md) · [Índice](../README.md)
