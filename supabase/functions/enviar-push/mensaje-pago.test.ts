import { describe, expect, it } from "vitest";
import { mensajeDePago, type PagoParaAvisar } from "./mensaje-pago";

// Intl separa los miles con espacio duro (U+00A0). Escrito con escape para que
// la diferencia se vea al leer un test que falla.
const ESPACIO_DURO = "\u00A0";

const BASE: PagoParaAvisar = {
  id: "8f1c7a2e-0000-0000-0000-000000000001",
  monto_centimos: 1_203_600,
  remitente_nombre: "MARIELLA_LO_VEGA",
  referencia_detalle: "Verduras -87138944",
};

describe("mensajeDePago", () => {
  it("pone el monto en colones en el título", () => {
    expect(mensajeDePago(BASE).titulo).toBe(`Entró ₡12${ESPACIO_DURO}036`);
  });

  it("devuelve los guiones bajos de Davibank a espacios", () => {
    expect(mensajeDePago(BASE).cuerpo).toBe("MARIELLA LO VEGA · Verduras -87138944");
  });

  it("usa el concepto cuando el banco no dice quién pagó", () => {
    // El caso del BAC: remitente_nombre siempre viene null.
    const pago = { ...BASE, remitente_nombre: null, referencia_detalle: "LAGUNAS AGRICOLA" };

    expect(mensajeDePago(pago).cuerpo).toBe("LAGUNAS AGRICOLA");
  });

  it("no deja el cuerpo vacío cuando no hay nombre ni concepto", () => {
    const pago = { ...BASE, remitente_nombre: null, referencia_detalle: null };

    expect(mensajeDePago(pago).cuerpo).toBe("Sin datos del remitente");
  });

  it("ignora un nombre que es solo espacios", () => {
    const pago = { ...BASE, remitente_nombre: "   ", referencia_detalle: null };

    expect(mensajeDePago(pago).cuerpo).toBe("Sin datos del remitente");
  });

  it("muestra los céntimos cuando el monto no es redondo", () => {
    // Davibank avisa montos como "51,175.44": el BAC y las transferencias traen
    // decimales, y redondearlos en el aviso haría dudar de si es el mismo pago.
    const pago = { ...BASE, monto_centimos: 5_117_544 };

    expect(mensajeDePago(pago).titulo).toBe(`Entró ₡51${ESPACIO_DURO}175,44`);
  });

  it("le da a cada pago su propio tag para que no se pisen en la bandeja", () => {
    const otro = { ...BASE, id: "8f1c7a2e-0000-0000-0000-000000000002" };

    expect(mensajeDePago(BASE).tag).not.toBe(mensajeDePago(otro).tag);
  });
});
