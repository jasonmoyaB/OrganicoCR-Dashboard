import { describe, expect, it } from "vitest";
import { formatColones } from "./format-colones";

// Intl separa los miles con espacio duro (U+00A0), no con espacio normal.
// Se escribe con escape para que la diferencia sea visible al leer el test.
const ESPACIO_DURO = "\u00A0";

describe("formatColones", () => {
  it("convierte céntimos a colones con separador de miles", () => {
    expect(formatColones(1_500_000)).toBe(`₡15${ESPACIO_DURO}000`);
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
