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
