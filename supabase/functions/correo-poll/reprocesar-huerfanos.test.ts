import { describe, expect, it } from "vitest";
import { reprocesarHuerfanos } from "./reprocesar-huerfanos.ts";
import { supabaseFalso } from "./supabase-falso.ts";

const HUERFANO = {
  id: 41,
  mensaje_id: "<viejo@davibank.cr>",
  remitente: "Davibank <servicioalcliente@davibank.cr>",
  cuerpo: "Envío exitoso de crédito directo por un monto de 5,000.00 CRC",
  recibido_at: "2026-03-06T09:00:00.000Z",
};

describe("reprocesarHuerfanos", () => {
  it("no escribe nada cuando no hay correos a medias", async () => {
    const { cliente, escrituras } = supabaseFalso({ huerfanos: [] });

    expect(await reprocesarHuerfanos(cliente)).toBe(0);
    expect(escrituras).toHaveLength(0);
  });

  it("pasa por el extractor el cuerpo guardado, sin tocar el buzón", async () => {
    const { cliente, escrituras } = supabaseFalso({ huerfanos: [HUERFANO] });

    expect(await reprocesarHuerfanos(cliente)).toBe(1);

    expect(escrituras).toHaveLength(1);
    expect(escrituras[0].tabla).toBe("correos_banco");
    expect(escrituras[0].campos.procesado_ok).toBe(true);
    expect(escrituras[0].campos.motivo_sin_pago).toBe("Egreso: Davibank envió la plata");
  });

  it("propaga el fallo en vez de dar la corrida por buena", async () => {
    const { cliente } = supabaseFalso({ huerfanos: [HUERFANO], errorAlMarcar: "timeout" });

    await expect(reprocesarHuerfanos(cliente)).rejects.toThrow(/No se pudo marcar el correo 41/);
  });
});
