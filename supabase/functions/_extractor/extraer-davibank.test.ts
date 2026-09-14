import { describe, expect, it } from "vitest";
import { extraerDavibank } from "./extraer-davibank.ts";

describe("extraerDavibank", () => {
  it("lee monto y remitente del aviso de SINPE Móvil", () => {
    const pago = extraerDavibank(
      "Davibank le informa ha recibido 12.036,00 colones de ANA MARIA SOLANO JEREZ al SINPE Movil.",
    );

    expect(pago?.montoCentimos).toBe(1_203_600);
    expect(pago?.remitenteNombre).toBe("ANA MARIA SOLANO JEREZ");
  });

  it("tolera el símbolo de colón y el acento en Móvil", () => {
    const pago = extraerDavibank(
      "Davibank le informa ha recibido ₡8.614,00 colones de ANNIELLA LI al SINPE Móvil",
    );

    expect(pago?.montoCentimos).toBe(861_400);
    expect(pago?.remitenteNombre).toBe("ANNIELLA LI");
  });

  it("tolera variantes del verbo y espacio de sobra", () => {
    const pago = extraerDavibank(
      "DAVIBANK LE INFORMA QUE HA RECIBIDO   13195   COLONES   DE   NADAV CHUDLER   AL SINPE MOVIL",
    );

    expect(pago?.montoCentimos).toBe(1_319_500);
    expect(pago?.remitenteNombre).toBe("NADAV CHUDLER");
  });

  it("funciona cuando el aviso viene en una sola línea junto a más texto", () => {
    const pago = extraerDavibank(
      "Estimado cliente\nDavibank le informa ha recibido 1.965,00 colones de W MOYA al SINPE Movil.\nGracias por preferirnos.",
    );

    expect(pago?.montoCentimos).toBe(196_500);
    expect(pago?.remitenteNombre).toBe("W MOYA");
  });

  // Los avisos de Davibank no traen un campo de referencia propio: lo que el
  // comprador escribe en el motivo, si escribe algo, no aparece en el texto
  // que se conoce hoy. Se devuelve null y el matcher cae a scoring (R6).
  it("devuelve null en la referencia porque el aviso no la trae", () => {
    const pago = extraerDavibank(
      "Davibank le informa ha recibido 1.000,00 colones de X Y al SINPE Movil",
    );

    expect(pago?.referenciaDetalle).toBeNull();
  });

  it("devuelve null si el correo no es un aviso de pago recibido", () => {
    expect(extraerDavibank("Davibank le recuerda que su estado de cuenta está listo")).toBeNull();
    expect(extraerDavibank("")).toBeNull();
  });

  // Un aviso reconocido a medias es peor que uno no reconocido: el no
  // reconocido cae al LLM, el medio reconocido inventa un monto.
  it("devuelve null si reconoce la frase pero el monto no se puede leer", () => {
    expect(
      extraerDavibank("Davibank le informa ha recibido varios colones de ANA SOLANO al SINPE"),
    ).toBeNull();
  });
});
