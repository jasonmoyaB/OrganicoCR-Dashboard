import { describe, expect, it } from "vitest";
import { RANGO } from "@/constants/rangos-fecha";
import { finDelDiaCR, inicioDelDiaCR, rangoDe, rangoPersonalizado } from "./rango-fechas";

// Las 10:00 de la mañana del 14 de septiembre en Costa Rica.
const MEDIA_MANANA = new Date("2026-09-14T16:00:00Z");

describe("inicioDelDiaCR / finDelDiaCR", () => {
  // Costa Rica es UTC-6: el dia arranca a las 06:00 UTC y termina a las
  // 05:59:59 del dia siguiente. Comparar contra el dia UTC dejaria fuera
  // todos los pagos de la tarde.
  it("abre el dia a las 06:00 UTC", () => {
    expect(inicioDelDiaCR("2026-09-14")).toBe("2026-09-14T06:00:00.000Z");
  });

  it("cierra el dia a las 05:59:59 del dia siguiente en UTC", () => {
    expect(finDelDiaCR("2026-09-14")).toBe("2026-09-15T05:59:59.999Z");
  });

  it("deja adentro un pago de las 19:00 hora tica", () => {
    const pago = "2026-09-15T01:00:00Z";

    expect(pago >= inicioDelDiaCR("2026-09-14")).toBe(true);
    expect(pago <= finDelDiaCR("2026-09-14")).toBe(true);
  });
});

describe("rangoDe", () => {
  it("hoy cubre el dia entero, no desde este momento", () => {
    expect(rangoDe(RANGO.HOY, MEDIA_MANANA)).toEqual({
      desde: "2026-09-14T06:00:00.000Z",
      hasta: "2026-09-15T05:59:59.999Z",
    });
  });

  it("ayer es un dia completo y no toca el de hoy", () => {
    const ayer = rangoDe(RANGO.AYER, MEDIA_MANANA);

    expect(ayer.desde).toBe("2026-09-13T06:00:00.000Z");
    expect(ayer.hasta).toBe("2026-09-14T05:59:59.999Z");
  });

  // "Ultimos 7 dias" incluye hoy, que es justo el dia que mas se mira.
  it("siete dias cuenta hoy como uno de los siete", () => {
    expect(rangoDe(RANGO.SIETE_DIAS, MEDIA_MANANA).desde).toBe("2026-09-08T06:00:00.000Z");
  });

  it("este mes arranca el primero", () => {
    expect(rangoDe(RANGO.ESTE_MES, MEDIA_MANANA).desde).toBe("2026-09-01T06:00:00.000Z");
  });

  it("cruza el fin de mes hacia atras sin inventar un dia cero", () => {
    expect(rangoDe(RANGO.AYER, new Date("2026-09-01T16:00:00Z")).desde).toBe(
      "2026-08-31T06:00:00.000Z",
    );
  });

  it("todo no pone limites", () => {
    expect(rangoDe(RANGO.TODO, MEDIA_MANANA)).toEqual({ desde: null, hasta: null });
  });
});

describe("rangoPersonalizado", () => {
  it("arma el rango con los dos extremos completos", () => {
    expect(rangoPersonalizado("2026-09-01", "2026-09-14")).toEqual({
      desde: "2026-09-01T06:00:00.000Z",
      hasta: "2026-09-15T05:59:59.999Z",
    });
  });

  it("deja abierto el lado que no se lleno", () => {
    expect(rangoPersonalizado("", "2026-09-14").desde).toBeNull();
    expect(rangoPersonalizado("2026-09-01", "").hasta).toBeNull();
  });
});
