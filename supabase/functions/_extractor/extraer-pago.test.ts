import { describe, expect, it } from "vitest";
import { extraerPago } from "./extraer-pago.ts";
import { pagoDe } from "./resultado-extraccion.ts";

const extraer = (from: string, cuerpo: string) => pagoDe(extraerPago(from, cuerpo));

const AVISO = "Davibank le informa ha recibido 12.036,00 colones de ANA SOLANO al SINPE Movil";

describe("extraerPago", () => {
  it("enruta al extractor del banco que mandó el correo", () => {
    const pago = extraer('"Davibank" <servicioalcliente@davibank.cr>', AVISO);

    expect(pago?.montoCentimos).toBe(1_203_600);
    expect(pago?.remitenteNombre).toBe("ANA SOLANO");
  });

  // Nunca `desconocido`: eso lo mandaría al respaldo LLM, y el LLM no puede
  // saber si el aviso lo escribió un banco o alguien que se hace pasar por uno.
  it.each([
    "notificacion@otrobanco.cr",
    "servicioalcliente@davibank.cr.evil.test",
    '"servicioalcliente@davibank.cr" <cobros@evil.test>',
  ])("descarta sin pasar por el LLM un remitente que no es un banco: %s", (from) => {
    expect(extraerPago(from, AVISO).clase).toBe("no-aplica");
  });

  it("no intenta adivinar con un From que no trae dirección", () => {
    expect(extraer("", AVISO)).toBeNull();
  });
});
