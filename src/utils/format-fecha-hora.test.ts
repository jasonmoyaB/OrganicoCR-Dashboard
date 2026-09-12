import { describe, expect, it } from "vitest";
import { formatFechaHora } from "./format-fecha-hora";

describe("formatFechaHora", () => {
  it("convierte UTC a hora de Costa Rica", () => {
    expect(formatFechaHora("2026-09-01T14:30:00Z")).toBe("01/09/2026 08:30");
  });

  // El pago que entra a las 23:00 de CR llega marcado como el día siguiente en
  // UTC. Formatear sin corregir el offset mostraría una fecha que no coincide
  // con la del estado de cuenta del banco.
  it("retrocede un día cuando el UTC ya cruzó la medianoche", () => {
    expect(formatFechaHora("2026-09-02T03:15:00Z")).toBe("01/09/2026 21:15");
  });

  it("rellena con cero los componentes de un solo dígito", () => {
    expect(formatFechaHora("2026-01-05T09:07:00Z")).toBe("05/01/2026 03:07");
  });

  it("lanza ante una fecha que no se puede interpretar", () => {
    expect(() => formatFechaHora("ayer")).toThrowError("Fecha inválida: ayer");
  });
});
