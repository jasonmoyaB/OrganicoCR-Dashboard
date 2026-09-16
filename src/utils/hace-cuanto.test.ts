import { describe, expect, it } from "vitest";
import { haceCuanto } from "./hace-cuanto";

const AHORA = new Date("2026-09-16T12:00:00Z");

describe("haceCuanto", () => {
  it("dice 'hace un momento' bajo el minuto", () => {
    expect(haceCuanto("2026-09-16T11:59:31Z", AHORA)).toBe("hace un momento");
  });

  it("cuenta minutos hasta la hora", () => {
    expect(haceCuanto("2026-09-16T11:15:00Z", AHORA)).toBe("hace 45 min");
    expect(haceCuanto("2026-09-16T11:01:00Z", AHORA)).toBe("hace 59 min");
  });

  it("cuenta horas hasta el día", () => {
    expect(haceCuanto("2026-09-16T09:00:00Z", AHORA)).toBe("hace 3 h");
    expect(haceCuanto("2026-09-15T12:30:00Z", AHORA)).toBe("hace 23 h");
  });

  it("singulariza el día y pluraliza el resto", () => {
    expect(haceCuanto("2026-09-15T11:00:00Z", AHORA)).toBe("hace 1 día");
    expect(haceCuanto("2026-09-10T12:00:00Z", AHORA)).toBe("hace 6 días");
  });

  // El reloj de Postgres y el del navegador no son el mismo. Un pago sellado
  // unos segundos en el futuro tiene que leerse como recién llegado, no como
  // un tiempo negativo.
  it("trata una fecha futura como recién llegada", () => {
    expect(haceCuanto("2026-09-16T12:00:30Z", AHORA)).toBe("hace un momento");
  });

  it("lanza ante una fecha ilegible", () => {
    expect(() => haceCuanto("ayer", AHORA)).toThrowError("Fecha inválida: ayer");
  });
});
