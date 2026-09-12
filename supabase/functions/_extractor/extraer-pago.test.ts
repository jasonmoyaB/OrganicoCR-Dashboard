import { describe, expect, it } from "vitest";
import { extraerPago } from "./extraer-pago";

const AVISO = "Davibank le informa ha recibido 12.036,00 colones de ANA SOLANO al SINPE Movil";

describe("extraerPago", () => {
  it("enruta al extractor del banco que mandó el correo", () => {
    const pago = extraerPago('"Davibank" <servicioalcliente@davibank.cr>', AVISO);

    expect(pago?.montoCentimos).toBe(1_203_600);
    expect(pago?.remitenteNombre).toBe("ANA SOLANO");
  });

  // Un banco sin extractor registrado no es un error: cae al respaldo LLM.
  // Devolver null es la señal de "esto no lo sé leer", no de "esto está roto".
  it("devuelve null si el remitente no tiene extractor registrado", () => {
    expect(extraerPago("notificacion@otrobanco.cr", AVISO)).toBeNull();
  });

  it("no intenta adivinar con un From que no trae dirección", () => {
    expect(extraerPago("", AVISO)).toBeNull();
  });
});
