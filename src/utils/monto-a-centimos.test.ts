import { describe, expect, it } from "vitest";
import { montoACentimos } from "./monto-a-centimos";

describe("montoACentimos", () => {
  it("convierte el formato que devuelve WooCommerce", () => {
    expect(montoACentimos("15000.00")).toBe(1_500_000);
  });

  it("maneja un solo decimal", () => {
    expect(montoACentimos("1500.5")).toBe(150_050);
  });

  // La tienda real devuelve los totales en CRC sin decimales: "1965", no "1965.00".
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
