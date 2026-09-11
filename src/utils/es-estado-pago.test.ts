import { describe, expect, it } from "vitest";
import { esEstadoPago } from "./es-estado-pago";

describe("esEstadoPago", () => {
  it("acepta los cuatro estados del check constraint", () => {
    expect(esEstadoPago("pendiente")).toBe(true);
    expect(esEstadoPago("revisar")).toBe(true);
    expect(esEstadoPago("pagado")).toBe(true);
    expect(esEstadoPago("anulado")).toBe(true);
  });

  it("rechaza un estado que la base todavía no tiene", () => {
    expect(esEstadoPago("reembolsado")).toBe(false);
  });

  it("rechaza cadena vacía y variantes de mayúsculas", () => {
    expect(esEstadoPago("")).toBe(false);
    expect(esEstadoPago("Pendiente")).toBe(false);
  });
});
