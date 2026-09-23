import { describe, expect, it } from "vitest";
import { pagoDe } from "../_extractor/resultado-extraccion.ts";
import { leerRespuestaLlm, type RespuestaLlm } from "./leer-respuesta-llm.ts";

const COBRO: RespuestaLlm = {
  clase: "pago",
  motivo: "",
  monto_texto: "377,742.05",
  moneda: "CRC",
  remitente_nombre: "ANA SOLANO",
  referencia_detalle: "Verduras 1069",
  confianza: 0.97,
};

function con(cambios: Partial<RespuestaLlm>): RespuestaLlm {
  return { ...COBRO, ...cambios };
}

describe("leerRespuestaLlm", () => {
  it("convierte el monto escrito a céntimos en vez de creerle la cuenta al modelo", () => {
    expect(pagoDe(leerRespuestaLlm(COBRO))?.montoCentimos).toBe(37_774_205);
  });

  it("conserva nombre y referencia, que es lo que el matcher usa para cruzar", () => {
    const pago = pagoDe(leerRespuestaLlm(COBRO));

    expect(pago?.remitenteNombre).toBe("ANA SOLANO");
    expect(pago?.referenciaDetalle).toBe("Verduras 1069");
  });

  it("acepta que el BAC no diga quién pagó", () => {
    expect(pagoDe(leerRespuestaLlm(con({ remitente_nombre: null })))?.remitenteNombre).toBeNull();
  });

  // Los tres frenos. Cada uno, por separado, evita registrar plata que no entró.
  it("no registra un pago si el modelo no está seguro", () => {
    expect(leerRespuestaLlm(con({ confianza: 0.89 })).clase).toBe("desconocido");
  });

  it("no toma un ingreso en dólares por uno en colones", () => {
    const resultado = leerRespuestaLlm(con({ moneda: "USD", monto_texto: "500.00" }));

    expect(resultado.clase).toBe("no-aplica");
    expect(pagoDe(resultado)).toBeNull();
  });

  it("descarta un egreso reconocido sin encender el cartel de correo ilegible", () => {
    const resultado = leerRespuestaLlm(
      con({ clase: "no-aplica", motivo: "Envío exitoso de SINPE" }),
    );

    expect(resultado).toEqual({ clase: "no-aplica", motivo: "Envío exitoso de SINPE" });
  });

  it("deja el correo para revisar a mano cuando el modelo tampoco lo entendió", () => {
    expect(leerRespuestaLlm(con({ clase: "desconocido" })).clase).toBe("desconocido");
  });

  it("rechaza un monto ilegible en vez de guardar una cifra inventada", () => {
    expect(() => leerRespuestaLlm(con({ monto_texto: "mil quinientos" }))).toThrow();
  });
});
