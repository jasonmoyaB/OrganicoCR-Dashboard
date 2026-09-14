import { describe, expect, it } from "vitest";
import { agruparPorDia } from "./agrupar-por-dia";

const fechaDe = (item: { fecha: string }) => item.fecha;

describe("agruparPorDia", () => {
  it("junta en un grupo lo que cayo el mismo dia", () => {
    const grupos = agruparPorDia(
      [{ fecha: "2026-09-14T15:00:00Z" }, { fecha: "2026-09-14T17:30:00Z" }],
      fechaDe,
    );

    expect(grupos).toHaveLength(1);
    expect(grupos[0].items).toHaveLength(2);
  });

  // Un pago de las 19:00 hora tica son las 01:00 UTC del dia siguiente.
  // Agrupar por el instante crudo mandaria la tarde al reporte de mañana.
  it("agrupa por el dia de Costa Rica y no por el de UTC", () => {
    const grupos = agruparPorDia(
      [{ fecha: "2026-09-15T01:00:00Z" }, { fecha: "2026-09-14T20:00:00Z" }],
      fechaDe,
    );

    expect(grupos).toHaveLength(1);
    expect(grupos[0].dia).toBe("2026-09-14");
  });

  it("separa los dias distintos y respeta el orden de entrada", () => {
    const grupos = agruparPorDia(
      [{ fecha: "2026-09-14T15:00:00Z" }, { fecha: "2026-09-12T15:00:00Z" }],
      fechaDe,
    );

    expect(grupos.map((grupo) => grupo.dia)).toEqual(["2026-09-14", "2026-09-12"]);
  });

  it("devuelve vacio cuando no hay nada que agrupar", () => {
    expect(agruparPorDia([], fechaDe)).toEqual([]);
  });
});
