import { describe, expect, it } from "vitest";
import { normalizarMontoCRC } from "./normalizar-monto-crc";

describe("normalizarMontoCRC", () => {
  it("lee el formato de Costa Rica: punto para miles, coma para decimales", () => {
    expect(normalizarMontoCRC("12.036,00")).toBe(1_203_600);
    expect(normalizarMontoCRC("1.234.567,89")).toBe(123_456_789);
  });

  // No se sabe cuál de los dos formatos usa el banco hasta ver un correo real,
  // y la diferencia entre 12.036 colones y 12,03 son cuatro órdenes de
  // magnitud. Se aceptan ambos y se decide por la forma, no por suponer.
  it("lee también el formato inglés: coma para miles, punto para decimales", () => {
    expect(normalizarMontoCRC("12,036.00")).toBe(1_203_600);
  });

  it("trata un separador seguido de tres dígitos como miles", () => {
    expect(normalizarMontoCRC("1.500")).toBe(150_000);
    expect(normalizarMontoCRC("1,500")).toBe(150_000);
  });

  it("trata un separador seguido de uno o dos dígitos como decimales", () => {
    expect(normalizarMontoCRC("12,03")).toBe(1_203);
    expect(normalizarMontoCRC("12.5")).toBe(1_250);
  });

  it("acepta enteros sin separador", () => {
    expect(normalizarMontoCRC("12036")).toBe(1_203_600);
  });

  it("ignora el símbolo de colón, las siglas y los espacios", () => {
    expect(normalizarMontoCRC("₡12.036,00")).toBe(1_203_600);
    expect(normalizarMontoCRC("CRC 12.036,00")).toBe(1_203_600);
    // Intl.NumberFormat("es-CR") separa los miles con U+00A0, no con espacio.
    expect(normalizarMontoCRC("12 036,00")).toBe(1_203_600);
  });

  it("lanza en vez de adivinar cuando el separador no encaja en ningún formato", () => {
    expect(() => normalizarMontoCRC("12.3456")).toThrowError("Monto inválido: 12.3456");
  });

  it("lanza ante texto sin dígitos", () => {
    expect(() => normalizarMontoCRC("")).toThrowError("Monto inválido: ");
    expect(() => normalizarMontoCRC("varios colones")).toThrowError(
      "Monto inválido: varios colones",
    );
  });

  it("lanza cuando falta la parte entera en vez de asumir un cero", () => {
    expect(() => normalizarMontoCRC(",50")).toThrowError("Monto inválido: ,50");
  });
});
