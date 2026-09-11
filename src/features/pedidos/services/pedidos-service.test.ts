import { describe, expect, it } from "vitest";
import { mapearPedido } from "./pedidos-service";
import type { PedidoRow } from "../types/pedido.types";

const FILA: PedidoRow = {
  id: "11111111-1111-1111-1111-111111111111",
  woo_order_id: 1234,
  numero_pedido: "1234",
  cliente_nombre: "Ana Rojas",
  cliente_email: "ana@example.com",
  cliente_telefono: null,
  total_centimos: 1_500_000,
  moneda: "CRC",
  estado_woo: "on-hold",
  estado_pago: "pendiente",
  fecha_pedido: "2026-09-01T10:00:00Z",
  raw: {},
  created_at: "2026-09-01T10:00:00Z",
  updated_at: "2026-09-01T10:00:00Z",
};

describe("mapearPedido", () => {
  it("convierte snake_case de la base a camelCase del dominio", () => {
    const pedido = mapearPedido(FILA);

    expect(pedido.wooOrderId).toBe(1234);
    expect(pedido.clienteNombre).toBe("Ana Rojas");
    expect(pedido.totalCentimos).toBe(1_500_000);
    expect(pedido.estadoPago).toBe("pendiente");
  });

  it("preserva los nulos en vez de convertirlos a string vacío", () => {
    expect(mapearPedido(FILA).clienteTelefono).toBeNull();
  });

  // La base tipa estado_pago como `string`: el check constraint no llega al
  // tipo generado. Sin esta comprobación, una migración que agregue un estado
  // nuevo lo dejaría pasar y la UI lo renderizaría mal sin avisar.
  it("lanza si la base devuelve un estado que el dominio no conoce", () => {
    const filaCorrupta: PedidoRow = { ...FILA, estado_pago: "reembolsado" };

    expect(() => mapearPedido(filaCorrupta)).toThrowError(
      "Estado de pago desconocido en el pedido 1234: reembolsado",
    );
  });
});
