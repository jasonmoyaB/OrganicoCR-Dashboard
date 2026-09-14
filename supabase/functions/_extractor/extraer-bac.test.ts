import { describe, expect, it } from "vitest";
import { extraerBAC } from "./extraer-bac.ts";
import { pagoDe } from "./resultado-extraccion.ts";

// Textos calcados de avisos reales del buzón, con los datos cambiados: el
// repositorio es público. El BAC usa cuatro redacciones y la única palabra que
// separa un cobro de un pago propio es el verbo de la cuenta.
const ACREDITANDO =
  "Hola CLIENTE EJEMPLO SA : BAC le comunica que recibió una transferencia SINPE con el " +
  "número de referencia 2026082515231000041060954, el día 25/08/2026 a las 07:53:20 p.m. " +
  "horas, acreditando la cuenta IBAN CR5301XXXXXXXXXXXX1733 un monto de 79,891.00 Colones, " +
  "por concepto de ZARCERO AGRICOLA. Muchas gracias.";

const RECIBIO =
  "Hola Estimado Cliente CLIENTE EJEMPLO : BAC Credomatic le comunica que recibió una " +
  "transferencia SINPE con el número de referencia 2026081715122001123574316 a su cuenta " +
  "IBAN CR5301XXXXXXXXXXXX1733 por un monto de 2,355,451.40 Colones por concepto " +
  "FACT 7277 7282 7285, la cual se aplicó correctamente el día 17/8/2026 a las 1:40 PM.";

const DEBITANDO =
  "Hola: CLIENTE EJEMPLO SA : BAC le comunica que la transferencia SINPE con el número de " +
  "referencia 2026090910231001294993449, se aplicó con éxito en el ciclo del día 09/09/2026, " +
  "debitando su cuenta IBAN CR6301XXXXXXXXXXXX1650 un monto de 43,000.00 Colones, por " +
  "concepto de Pago_camisa____. Día y hora 09/09/2026 09:51:52 p.m.";

const EN_DOLARES = RECIBIO.replace("2,355,451.40 Colones", "4,887.37 Dólares");

describe("extraerBAC", () => {
  it("lee el cobro que llega con 'acreditando la cuenta'", () => {
    const pago = pagoDe(extraerBAC(ACREDITANDO));

    expect(pago?.montoCentimos).toBe(7_989_100);
    expect(pago?.referenciaDetalle).toBe("ZARCERO AGRICOLA");
  });

  it("lee el cobro que llega con 'recibió una transferencia' y corta antes del 'la cual'", () => {
    const pago = pagoDe(extraerBAC(RECIBIO));

    expect(pago?.montoCentimos).toBe(235_545_140);
    expect(pago?.referenciaDetalle).toBe("FACT 7277 7282 7285");
  });

  // El BAC solo nombra al titular de la cuenta, que es el propio dueño. Poner
  // ese nombre haría que el matcher cruzara todos los pagos del BAC contra el
  // cliente equivocado.
  it("no inventa un remitente, porque el BAC no dice quien mando la plata", () => {
    expect(pagoDe(extraerBAC(ACREDITANDO))?.remitenteNombre).toBeNull();
  });

  // Mismo monto, misma moneda, misma frase "por concepto de": lo único que lo
  // separa de un cobro es "debitando". Confundirlos inventaria cobros.
  it("descarta el egreso en vez de tomarlo por cobro", () => {
    const resultado = extraerBAC(DEBITANDO);

    expect(resultado.clase).toBe("no-aplica");
    expect(pagoDe(resultado)).toBeNull();
  });

  it("descarta el ingreso en dolares, y lo distingue de un formato ilegible", () => {
    expect(extraerBAC(EN_DOLARES).clase).toBe("no-aplica");
  });

  it("marca como desconocido lo que no reconoce, para que alguien lo mire", () => {
    expect(extraerBAC("BAC le recuerda que su estado de cuenta esta listo").clase).toBe(
      "desconocido",
    );
  });
});
