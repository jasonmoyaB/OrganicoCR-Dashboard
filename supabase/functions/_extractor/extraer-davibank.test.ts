import { describe, expect, it } from "vitest";
import { extraerDavibank } from "./extraer-davibank.ts";
import { pagoDe } from "./resultado-extraccion.ts";

// Los tests miran el cobro; que el correo sea un egreso o venga en otra moneda
// se prueba aparte, en los casos de `clase`.
const extraer = (cuerpo: string) => pagoDe(extraerDavibank(cuerpo));

describe("extraerDavibank", () => {
  it("lee monto y remitente del aviso de SINPE Móvil", () => {
    const pago = extraer(
      "Davibank le informa ha recibido 12.036,00 colones de ANA MARIA SOLANO JEREZ al SINPE Movil.",
    );

    expect(pago?.montoCentimos).toBe(1_203_600);
    expect(pago?.remitenteNombre).toBe("ANA MARIA SOLANO JEREZ");
  });

  it("tolera el símbolo de colón y el acento en Móvil", () => {
    const pago = extraer(
      "Davibank le informa ha recibido ₡8.614,00 colones de ANNIELLA LI al SINPE Móvil",
    );

    expect(pago?.montoCentimos).toBe(861_400);
    expect(pago?.remitenteNombre).toBe("ANNIELLA LI");
  });

  it("tolera variantes del verbo y espacio de sobra", () => {
    const pago = extraer(
      "DAVIBANK LE INFORMA QUE HA RECIBIDO   13195   COLONES   DE   NADAV CHUDLER   AL SINPE MOVIL",
    );

    expect(pago?.montoCentimos).toBe(1_319_500);
    expect(pago?.remitenteNombre).toBe("NADAV CHUDLER");
  });

  it("funciona cuando el aviso viene en una sola línea junto a más texto", () => {
    const pago = extraer(
      "Estimado cliente\nDavibank le informa ha recibido 1.965,00 colones de W MOYA al SINPE Movil.\nGracias por preferirnos.",
    );

    expect(pago?.montoCentimos).toBe(196_500);
    expect(pago?.remitenteNombre).toBe("W MOYA");
  });

  // Los avisos de Davibank no traen un campo de referencia propio: lo que el
  // comprador escribe en el motivo, si escribe algo, no aparece en el texto
  // que se conoce hoy. Se devuelve null y el matcher cae a scoring (R6).
  it("devuelve null en la referencia porque el aviso no la trae", () => {
    const pago = extraer(
      "Davibank le informa ha recibido 1.000,00 colones de X Y al SINPE Movil",
    );

    expect(pago?.referenciaDetalle).toBeNull();
  });

  it("devuelve null si el correo no es un aviso de pago recibido", () => {
    expect(extraer("Davibank le recuerda que su estado de cuenta está listo")).toBeNull();
    expect(extraer("")).toBeNull();
  });

  // Un aviso reconocido a medias es peor que uno no reconocido: el no
  // reconocido cae al LLM, el medio reconocido inventa un monto.
  it("devuelve null si reconoce la frase pero el monto no se puede leer", () => {
    expect(
      extraer("Davibank le informa ha recibido varios colones de ANA SOLANO al SINPE"),
    ).toBeNull();
  });
});

// Los casos de acá abajo salieron de avisos reales del buzón del negocio
// (2026-09-14), con los nombres cambiados: el repositorio es público. Antes de
// leerlos, el extractor conocía una sola de las tres redacciones de Davibank y
// perdía en silencio 8 de los 17 ingresos de la muestra.
describe("extraerDavibank contra las redacciones reales", () => {
  it("lee el aviso de SINPE Movil tal como llega, con miles en coma y decimales en punto", () => {
    const pago = extraer(
      "DAVIbank le informa Ha recibido 2,412.01 Colones de PEREZ DE OLIVEIRA JUAN al SINPE " +
        "Móvil 87138944 por SINPE Móvil, 0. 2026091481483000974589565 Pago Compra 20260911",
    );

    expect(pago?.montoCentimos).toBe(241_201);
    expect(pago?.remitenteNombre).toBe("PEREZ DE OLIVEIRA JUAN");
    expect(pago?.referenciaDetalle).toBe("Pago Compra 20260911");
  });

  it("devuelve el motivo que escribio quien paga, que es lo que salva al matcher cuando el nombre viene truncado", () => {
    const pago = extraer(
      "Ha recibido 49,816.00 Colones de ESTHER CECILIA SOLA al SINPE Móvil 87138944 por " +
        "SINPE Móvil, 0. 2026083115183010908319841 Verduras -87138944",
    );

    expect(pago?.referenciaDetalle).toBe("Verduras -87138944");
  });

  it("lee el aviso de pago inmediato, donde la moneda va detras del numero", () => {
    const pago = extraer(
      "DAVIbank le informa, que ha recibido un pago inmediato de EMPRESAS_X_S.A. desde BAC San " +
        "José S.A a través de SINPE, por un monto de 51,175.44 CRC. Número de referencia: " +
        "2026082810222010530093446 Fecha de registro: 2026/08/28 9:39:00 AM.",
    );

    expect(pago?.montoCentimos).toBe(5_117_544);
    expect(pago?.remitenteNombre).toBe("EMPRESAS X S.A.");
    expect(pago?.referenciaDetalle).toBe("2026082810222010530093446");
  });

  // El punto que cierra la oración se pegaba al monto y el normalizador
  // rechazaba la cifra entera, así que el aviso se perdía sin dejar rastro.
  it("lee la transferencia SINPE sin tragarse el punto final de la oracion", () => {
    const pago = extraer(
      "DAVIbank le informa, que ha recibido una transferencia SINPE de ALIANZA_CAMPESINA_FL " +
        "por un monto de CRC 377,742.05. Número de referencia: 2026082810231001291415166 " +
        "Fecha de registro: 2026/08/28.",
    );

    expect(pago?.montoCentimos).toBe(37_774_205);
    expect(pago?.remitenteNombre).toBe("ALIANZA CAMPESINA FL");
  });

  // Davibank avisa los ingresos en dolares con la misma redaccion. Leerlos como
  // colones los haria cuadrar con el pedido equivocado (P6).
  it("ignora el aviso en dolares en vez de tomarlo por colones", () => {
    expect(
      extraer(
        "DAVIbank le informa, que ha recibido un pago inmediato de CONSULTORES_X desde BAC San " +
          "José S.A a través de SINPE, por un monto de 500.00 USD. Número de referencia: " +
          "2026090710222010534473569 Fecha de registro: 2026/09/07 5:07:00 PM.",
      ),
    ).toBeNull();
  });

  it("ignora el credito directo saliente, que es plata que salio y no que entro", () => {
    expect(
      extraer(
        "Envío exitoso de crédito directo DAVIbank le informa que se realizó el envío por " +
          "un monto de CRC 25,000.00 a la cuenta destino.",
      ),
    ).toBeNull();
  });

  it("ignora los avisos que no son de dinero", () => {
    expect(extraer("Inicio de sesión en canales digitales DAVIbank")).toBeNull();
  });
});

// La diferencia entre "no es un cobro" y "no lo entiendo" es lo que mantiene
// con significado el aviso de correos sin procesar del dashboard.
describe("extraerDavibank distingue lo descartado de lo ilegible", () => {
  it("descarta el envio saliente como no-aplica, no como ilegible", () => {
    const resultado = extraerDavibank(
      "Envío exitoso de crédito directo DAVIbank le informa que se realizó el envío por " +
        "un monto de CRC 25,000.00 a la cuenta destino.",
    );

    expect(resultado.clase).toBe("no-aplica");
  });

  it("descarta el debito recibido, que es plata que sale", () => {
    expect(
      extraerDavibank("Recepción de Débito Directo SINPE DAVIbank le informa, que se debitó")
        .clase,
    ).toBe("no-aplica");
  });

  it("descarta el ingreso en dolares como no-aplica", () => {
    const resultado = extraerDavibank(
      "DAVIbank le informa, que ha recibido un pago inmediato de CLIENTE_X desde BAC San " +
        "José S.A a través de SINPE, por un monto de 500.00 USD. Número de referencia: 202609.",
    );

    expect(resultado.clase).toBe("no-aplica");
  });

  it("deja en desconocido lo que de verdad no reconoce", () => {
    expect(extraerDavibank("Inicio de sesión en canales digitales DAVIbank").clase).toBe(
      "desconocido",
    );
  });

// Salió del buzón real: un crédito entrante que fue devuelto trae un monto en
// CRC con la misma forma que un cobro.
  it("descarta la devolucion de un credito entrante, que es plata que no entro", () => {
  const resultado = extraerDavibank(
    "Devolución de crédito directo Entrante DAVIbank le informa. El crédito directo " +
      "#2026072215231000040514286 por un monto de 29,236.00 CRC fue devuelto",
  );

  expect(resultado.clase).toBe("no-aplica");
  });
});
