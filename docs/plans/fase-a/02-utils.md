« [Fase A](README.md)

# 02 · Utils puras (TDD)

**Produce:** tres funciones puras y 13 tests.

Se empieza por acá porque son las únicas piezas sin dependencias. Tests reales, rápidos, sin mocks, sin infraestructura.

**Files:**
- Create: `src/utils/format-colones.ts` + `.test.ts`
- Create: `src/utils/dias-transcurridos.ts` + `.test.ts`
- Create: `src/utils/monto-a-centimos.ts` + `.test.ts`

## `formatColones`

- [ ] **Step 1: Escribir el test**

`src/utils/format-colones.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { formatColones } from "./format-colones";

describe("formatColones", () => {
  it("convierte céntimos a colones con separador de miles", () => {
    expect(formatColones(1_500_000)).toBe("₡15 000");
  });

  it("omite los céntimos cuando son cero", () => {
    expect(formatColones(50_000)).toBe("₡500");
  });

  it("muestra los céntimos cuando no son cero", () => {
    expect(formatColones(50_050)).toBe("₡500,50");
  });

  it("maneja el cero", () => {
    expect(formatColones(0)).toBe("₡0");
  });
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `pnpm test src/utils/format-colones.test.ts`
Expected: FAIL — `Failed to resolve import "./format-colones"`

- [ ] **Step 3: Implementar**

`src/utils/format-colones.ts`:

```ts
const LOCALE_CR = "es-CR";

export function formatColones(centimos: number): string {
  const colones = centimos / 100;
  const tieneCentimos = centimos % 100 !== 0;

  const numero = new Intl.NumberFormat(LOCALE_CR, {
    minimumFractionDigits: tieneCentimos ? 2 : 0,
    maximumFractionDigits: tieneCentimos ? 2 : 0,
  }).format(colones);

  return `₡${numero}`;
}
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `pnpm test src/utils/format-colones.test.ts`
Expected: PASS, 4 tests.

Si falla por el separador de miles, imprimir el valor real: `Intl` puede usar espacio estrecho (` `) en vez de espacio normal según la versión de Node. Ajustar los `expect` al carácter que devuelva realmente — **no la implementación**.

## `diasTranscurridos`

- [ ] **Step 5: Escribir el test**

`src/utils/dias-transcurridos.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { diasTranscurridos } from "./dias-transcurridos";

const AHORA = new Date("2026-09-11T10:00:00Z");

describe("diasTranscurridos", () => {
  it("devuelve 0 el mismo día", () => {
    expect(diasTranscurridos("2026-09-11T02:00:00Z", AHORA)).toBe(0);
  });

  it("cuenta días completos", () => {
    expect(diasTranscurridos("2026-09-04T10:00:00Z", AHORA)).toBe(7);
  });

  it("trunca fracciones de día hacia abajo", () => {
    expect(diasTranscurridos("2026-09-10T23:00:00Z", AHORA)).toBe(0);
  });

  it("devuelve 0 para fechas futuras en vez de negativos", () => {
    expect(diasTranscurridos("2026-09-20T10:00:00Z", AHORA)).toBe(0);
  });
});
```

- [ ] **Step 6: Correr y verificar que falla**

Run: `pnpm test src/utils/dias-transcurridos.test.ts`
Expected: FAIL — módulo no encontrado.

- [ ] **Step 7: Implementar**

`src/utils/dias-transcurridos.ts`:

```ts
const MS_POR_DIA = 1000 * 60 * 60 * 24;

export function diasTranscurridos(fechaISO: string, ahora: Date = new Date()): number {
  const transcurrido = ahora.getTime() - new Date(fechaISO).getTime();
  if (transcurrido <= 0) return 0;
  return Math.floor(transcurrido / MS_POR_DIA);
}
```

El parámetro `ahora` existe para que los tests sean deterministas. Sin él habría que mockear el reloj global.

- [ ] **Step 8: Correr y verificar que pasa**

Run: `pnpm test src/utils/dias-transcurridos.test.ts`
Expected: PASS, 4 tests.

## `montoACentimos`

- [ ] **Step 9: Escribir el test**

`src/utils/monto-a-centimos.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { montoACentimos } from "./monto-a-centimos";

describe("montoACentimos", () => {
  it("convierte el formato que devuelve WooCommerce", () => {
    expect(montoACentimos("15000.00")).toBe(1_500_000);
  });

  it("maneja un solo decimal", () => {
    expect(montoACentimos("1500.5")).toBe(150_050);
  });

  it("maneja enteros sin punto decimal", () => {
    expect(montoACentimos("1500")).toBe(150_000);
  });

  it("devuelve 0 para string vacío", () => {
    expect(montoACentimos("")).toBe(0);
  });

  it("lanza error ante texto no numérico en vez de devolver NaN", () => {
    expect(() => montoACentimos("abc")).toThrow("Monto inválido: abc");
  });
});
```

El caso de entero sin punto no es hipotético: la tienda real devuelve `"1965"`, no `"1965.00"`. Ver [referencia](../../referencia/tienda-woocommerce.md).

- [ ] **Step 10: Correr y verificar que falla**

Run: `pnpm test src/utils/monto-a-centimos.test.ts`
Expected: FAIL — módulo no encontrado.

- [ ] **Step 11: Implementar**

`src/utils/monto-a-centimos.ts`:

```ts
export function montoACentimos(monto: string): number {
  if (monto.trim() === "") return 0;

  const valor = Number(monto);
  if (Number.isNaN(valor)) {
    throw new Error(`Monto inválido: ${monto}`);
  }

  return Math.round(valor * 100);
}
```

El `throw` es deliberado: un monto que no se puede parsear es un pedido que entraría a la base con un total incorrecto. Fallar ruidosamente en el ingest es preferible a guardar `NaN` o `0` y descubrir meses después que los totales no cuadran.

- [ ] **Step 12: Correr toda la suite**

Run: `pnpm test`
Expected: PASS, **13 tests en 3 archivos**.

- [ ] **Step 13: Commit**

```bash
git add src/utils
git commit -m "feat: utils de formato de colones, días transcurridos y conversión de montos"
```

---

« [01 · Scaffold](01-scaffold.md) · [03 · Migración →](03-migracion.md)
