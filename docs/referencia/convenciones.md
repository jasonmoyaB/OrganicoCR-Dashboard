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

## Las dos excepciones a las capas

**Los `sw*.js` viven en `/public`, en JavaScript pelado.** El navegador identifica un service worker por su URL: si pasaran por el bundle tendrían un hash en el nombre y cada deploy instalaría un worker nuevo en vez de actualizar el que está. El precio es que `oxlint` y `tsc` no los miran — son los únicos archivos del proyecto sin red de seguridad, y se revisan a mano.

`sw.js` no tiene lógica propia: solo `importScripts` de `sw-cache.js` y `sw-push.js`. El navegador exige un único archivo registrado; esa es la única forma de que caché y notificaciones no compartan archivo.

**Las Edge Functions no importan de `src/`.** El bundler de `supabase functions deploy` no sigue imports fuera de `supabase/functions/`: compartir el archivo no rompería en local, rompería en el deploy. Por eso `enviar-push/mensaje-pago.ts` tiene su propia copia del formateo de colones, con un comentario que apunta a `src/utils/format-colones.ts`. **Si cambia el formato de los montos, hay que tocar los dos.**

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

Y los dos que cierran el circuito:

```bash
pnpm test:sql                            # matcher y resolver_conciliacion
pnpm dlx react-doctor@latest --verbose   # 100/100
```

`db reset` borra `auth.users`: después va `pnpm usuario:dev`.

---

« [Tienda WooCommerce](tienda-woocommerce.md) · [Índice](../README.md)
