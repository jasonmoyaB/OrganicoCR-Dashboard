import { describe, expect, it } from "vitest";
import { mapearPago } from "./pagos-service";
import type { PagoRow } from "../types/pago.types";

const FILA: PagoRow = {
  id: "22222222-2222-2222-2222-222222222222",
  gmail_message_id: "18f0a1b2c3d4e5f6",
  remitente_nombre: "ANA MARIA SOLANO JEREZ",
  monto_centimos: 1_203_600,
  referencia_detalle: "pedido 1062",
  fecha_pago: "2026-09-01T14:30:00Z",
  metodo_extraccion: "regex",
  confianza_extraccion: null,
};

describe("mapearPago", () => {
  it("convierte snake_case de la base a camelCase del dominio", () => {
    const pago = mapearPago(FILA);

    expect(pago.gmailMessageId).toBe("18f0a1b2c3d4e5f6");
    expect(pago.remitenteNombre).toBe("ANA MARIA SOLANO JEREZ");
    expect(pago.montoCentimos).toBe(1_203_600);
    expect(pago.metodoExtraccion).toBe("regex");
  });

  it("preserva los nulos en vez de convertirlos a string vacío", () => {
    const sinDatos: PagoRow = { ...FILA, remitente_nombre: null, referencia_detalle: null };
    const pago = mapearPago(sinDatos);

    expect(pago.remitenteNombre).toBeNull();
    expect(pago.referenciaDetalle).toBeNull();
  });

  // Mismo motivo que en pedidos: la base tipa metodo_extraccion como `string`
  // y el check constraint no llega al tipo generado. Si mañana se agrega un
  // método, esto lo detiene en vez de renderizarlo mal en silencio.
  it("lanza si la base devuelve un método de extracción desconocido", () => {
    const filaCorrupta: PagoRow = { ...FILA, metodo_extraccion: "manual" };

    expect(() => mapearPago(filaCorrupta)).toThrowError(
      "Método de extracción desconocido en el pago 18f0a1b2c3d4e5f6: manual",
    );
  });
});
