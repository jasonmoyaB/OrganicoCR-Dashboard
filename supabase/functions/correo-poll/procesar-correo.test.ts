import { describe, expect, it } from "vitest";
import { procesarCorreo, type CorreoGuardado } from "./procesar-correo.ts";
import { supabaseFalso } from "./supabase-falso.ts";

const DAVIBANK = "Davibank <servicioalcliente@davibank.cr>";

function correo(cuerpo: string, remitente = DAVIBANK): CorreoGuardado {
  return {
    id: 7,
    mensajeId: "<uno@davibank.cr>",
    remitente,
    cuerpo,
    recibidoAt: "2026-09-01T14:30:00.000Z",
  };
}

const COBRO = "Davibank le informa ha recibido 12.036,00 colones de ANA SOLANO al SINPE Movil.";
const EGRESO = "Envío exitoso de crédito directo por un monto de 5,000.00 CRC";

describe("procesarCorreo", () => {
  it("guarda el pago y marca el correo como procesado", async () => {
    const { cliente, escrituras } = supabaseFalso();

    expect(await procesarCorreo(cliente, correo(COBRO))).toBe("extraido");

    expect(escrituras[0].tabla).toBe("pagos");
    expect(escrituras[0].campos.monto_centimos).toBe(1_203_600);
    expect(escrituras[1]).toEqual({
      tabla: "correos_banco",
      campos: { procesado_ok: true, error: null },
    });
  });

  it("deja escrito el motivo cuando el correo no es un cobro", async () => {
    const { cliente, escrituras } = supabaseFalso();

    expect(await procesarCorreo(cliente, correo(EGRESO))).toBe("no-aplica");

    expect(escrituras).toHaveLength(1);
    expect(escrituras[0].campos.procesado_ok).toBe(true);
    expect(escrituras[0].campos.motivo_sin_pago).toBeTruthy();
  });

  it("marca procesado_ok en false cuando nadie reconoce el remitente", async () => {
    const { cliente, escrituras } = supabaseFalso();

    expect(await procesarCorreo(cliente, correo(COBRO, "otro@banco.cr"))).toBe("sin-extraer");

    expect(escrituras[0].campos.procesado_ok).toBe(false);
  });

  // La regresión que costó 36 correos el 2026-09-14: cuando el `update` fallaba
  // —la columna motivo_sin_pago todavía no existía en la nube— nadie miraba el
  // error, la corrida se daba por buena y el cursor avanzaba dejando el correo
  // atrás para siempre. Tiene que tirar, para que el cursor no se guarde.
  it("tira si no se pudo marcar el correo, en vez de reportar éxito", async () => {
    const { cliente } = supabaseFalso({
      errorAlMarcar: "column correos_banco.motivo_sin_pago does not exist",
    });

    await expect(procesarCorreo(cliente, correo(EGRESO))).rejects.toThrow(
      /No se pudo marcar el correo 7/,
    );
  });

  it("tira si no se pudo guardar el pago", async () => {
    const { cliente } = supabaseFalso({ errorAlGuardarPago: "violates check constraint" });

    await expect(procesarCorreo(cliente, correo(COBRO))).rejects.toThrow(
      /No se pudo guardar el pago/,
    );
  });
});
