import { describe, expect, it } from "vitest";
import { METODO_EXTRACCION } from "@/constants/metodos-extraccion";
import type { Pago } from "../types/pago.types";
import { pagosACSV } from "./exportar-pagos";

const BASE: Pago = {
  id: "1",
  mensajeId: "<a@b.cr>",
  remitenteNombre: "ANA SOLANO",
  montoCentimos: 1_203_650,
  referenciaDetalle: "Verduras -87138944",
  fechaPago: "2026-09-14T18:48:53Z",
  metodoExtraccion: METODO_EXTRACCION.REGEX,
  confianzaExtraccion: 1,
  pedido: null,
};

describe("pagosACSV", () => {
  it("escribe el monto en colones con decimales, no en centimos", () => {
    expect(pagosACSV([BASE])).toContain("12036.50");
  });

  it("deja vacias las columnas del pedido cuando el pago no cubre ninguno", () => {
    // Un encargo de WhatsApp se paga igual pero nunca paso por la tienda.
    expect(pagosACSV([BASE]).trimEnd().split("\r\n")[1].endsWith(";;")).toBe(true);
  });

  it("lleva el numero de pedido y el cliente cuando el pago ya se cruzo", () => {
    const csv = pagosACSV([
      { ...BASE, pedido: { numeroPedido: "1069", clienteNombre: "Delicias Marinas" } },
    ]);

    expect(csv).toContain("1069;Delicias Marinas");
  });

  it("neutraliza un motivo que Excel tomaria por formula", () => {
    const csv = pagosACSV([{ ...BASE, referenciaDetalle: "=1+1" }]);

    expect(csv).toContain("'=1+1");
  });
});
