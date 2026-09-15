import { describe, expect, it } from "vitest";
import { mapearPago, resumenCorreosSinProcesar } from "./pagos-service";
import type { PagoRow } from "../types/pago.types";

const FILA: PagoRow = {
  id: "22222222-2222-2222-2222-222222222222",
  mensaje_id: "<20260901.abc123@davibank.cr>",
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

    expect(pago.mensajeId).toBe("<20260901.abc123@davibank.cr>");
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
      "Método de extracción desconocido en el pago <20260901.abc123@davibank.cr>: manual",
    );
  });
});

// El RPC devuelve `returns table`, o sea un arreglo, y el service es el único
// lugar donde eso se traduce al dominio (mas_viejo -> masViejo).
function clienteConRpc(respuesta: unknown) {
  return { rpc: () => Promise.resolve(respuesta) } as never;
}

describe("resumenCorreosSinProcesar", () => {
  it("saca cantidad y fecha de la primera fila", async () => {
    const cliente = clienteConRpc({
      data: [{ cantidad: 36, mas_viejo: "2025-12-05T10:00:00Z" }],
      error: null,
    });

    expect(await resumenCorreosSinProcesar(cliente)).toEqual({
      cantidad: 36,
      masViejo: "2025-12-05T10:00:00Z",
    });
  });

  it("no inventa una fecha cuando no hay ningún correo sin leer", async () => {
    const cliente = clienteConRpc({ data: [{ cantidad: 0, mas_viejo: null }], error: null });

    expect(await resumenCorreosSinProcesar(cliente)).toEqual({ cantidad: 0, masViejo: null });
  });

  // Sin sesión el RPC devuelve permission denied. Tragarse ese error dejaría el
  // cartel apagado por el mismo motivo por el que debería encenderse.
  it("lanza cuando el RPC falla, en vez de devolver cero", async () => {
    const cliente = clienteConRpc({ data: null, error: { message: "permission denied" } });

    await expect(resumenCorreosSinProcesar(cliente)).rejects.toThrow(/permission denied/);
  });
});
