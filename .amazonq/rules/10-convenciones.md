# Convenciones de código — se revisan en todo PR

Detalle completo en `docs/referencia/convenciones.md`.

## Idioma: español

**El código, los nombres, los comentarios y los mensajes de error van en español**,
igual que el dominio: `cliente_nombre`, no `customer_name`; `montoCentimos`, no
`amountCents`. Vale para identificadores, nombres de archivo, commits, tests
(`it("lanza error ante texto no numérico")`) y comentarios de revisión.

Excepción: las APIs de terceros conservan sus nombres (`woo_order_id`,
`encrypted_password`, palabras clave de SQL y TypeScript).

## Capas — la dirección de las dependencias nunca al revés

```
components -> hooks -> services -> utils        components -> types / constants
```

- **components**: sin fetch, sin lógica de negocio.
- **hooks**: sin JSX.
- **services**: sin estado, sin UI.
- **utils**: puros, sin imports de framework.
- Un componente **no importa de otro componente de otra feature**. Lo compartido
  sube a `src/components/` o a la raíz de `src/`.

## Límites duros

| Límite | Valor |
|---|---|
| Líneas por archivo | 150 |
| Líneas por función | 30 |
| Parámetros | ≤ 3 |
| Niveles de indentación | ≤ 3 |
| Props por componente | ≤ 5 |

Archivos en **kebab-case** (`pedidos-service.ts`, `tarjeta-pago.tsx`).

## El mapeo `snake_case` → `camelCase` ocurre una sola vez, en el service

Ningún componente ni hook ve nunca un `cliente_nombre`. Referencia:
`src/features/pedidos/services/pedidos-service.ts`. Si un PR hace `pedido.cliente_nombre`
dentro de un `.tsx`, el mapeo se saltó una capa.

## Tests

Vitest, colocados junto al archivo (`format-colones.ts` + `format-colones.test.ts`).
Se testean **utils y services**; los componentes no llevan test unitario en este proyecto.
Un util nuevo sin test es un hallazgo válido en la revisión.

```bash
pnpm exec vitest run src/utils/format-colones.test.ts
pnpm exec vitest run -t "lanza error ante texto no numérico"
```

## Trampas del entorno ya verificadas — no re-litigar en el PR

Explicadas en `docs/referencia/entorno.md`.

- **`.claude/worktrees/` contiene worktrees de OTRO repositorio.** Por eso
  `test.include` es explícito en `vite.config.ts` y el lint corre como
  `oxlint src` por argumento de CLI. Si el test runner reporta más archivos de
  los esperados, es esto — no un bug del PR.
- `tsc -b` no acepta `--noEmit`; `baseUrl` está deprecado en TS 6 y el alias
  `@/*` funciona solo con `paths`.
- `Intl.NumberFormat("es-CR")` separa los miles con **U+00A0**. En la salida de
  un test fallido se ve idéntico a un espacio normal.
- Tailwind v4 resetea `border: 0 solid` **sin color**: un `className="border"`
  pelado hereda `currentColor` y pinta casi negro. **Todo borde necesita su
  color explícito** — es un hallazgo real, no cosmético.
