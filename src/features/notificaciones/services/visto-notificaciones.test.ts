import { describe, expect, it } from "vitest";
import { marcaTrasLimpiar, sinVer } from "./visto-notificaciones";
import type { NotificacionPago } from "../types/notificacion.types";

function aviso(id: string, creadoEn: string): NotificacionPago {
  return { id, remitenteNombre: null, montoCentimos: 100, referenciaDetalle: null, creadoEn };
}

const AVISOS = [
  aviso("c", "2026-09-16T12:00:00+00:00"),
  aviso("b", "2026-09-16T10:00:00+00:00"),
  aviso("a", "2026-09-15T09:00:00+00:00"),
];

describe("sinVer", () => {
  it("deja solo lo llegado después de la marca", () => {
    const nuevos = sinVer(AVISOS, "2026-09-16T09:30:00.000Z");

    expect(nuevos.map((uno) => uno.id)).toEqual(["c", "b"]);
  });

  it("no cuenta el aviso que marcó el límite", () => {
    expect(sinVer(AVISOS, "2026-09-16T12:00:00.000Z")).toHaveLength(0);
  });

  // PostgREST sella con `+00:00` y `toISOString()` con `Z`. En orden
  // alfabético "Z" gana, así que comparar los textos daría por nuevo un aviso
  // ya visto y la campana no bajaría nunca de cero.
  it("compara instantes y no textos pese a los dos formatos de UTC", () => {
    expect(sinVer([aviso("c", "2026-09-16T12:00:00+00:00")], "2026-09-16T12:00:00.000Z")).toEqual(
      [],
    );
  });
});

describe("marcaTrasLimpiar", () => {
  it("toma la llegada más reciente, no el reloj de quien mira", () => {
    expect(marcaTrasLimpiar(AVISOS, "2026-09-01T00:00:00.000Z")).toBe("2026-09-16T12:00:00.000Z");
  });

  it("deja la marca como estaba cuando no hay nada que limpiar", () => {
    expect(marcaTrasLimpiar([], "2026-09-01T00:00:00.000Z")).toBe("2026-09-01T00:00:00.000Z");
  });
});
