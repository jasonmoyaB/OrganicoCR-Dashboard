import { describe, expect, it } from "vitest";
import { estadoPagoInicial, mapearPedidoWoo } from "./mapear-pedido";

const ORDEN_WOO = {
  id: 1234,
  number: "1234",
  status: "on-hold",
  currency: "CRC",
  total: "15000.00",
  date_created_gmt: "2026-09-01T10:00:00",
  billing: {
    first_name: "Ana",
    last_name: "Rojas",
    email: "ana@example.com",
    phone: "88887777",
  },
};

describe("mapearPedidoWoo", () => {
  it("extrae los campos que nos importan", () => {
    const fila = mapearPedidoWoo(ORDEN_WOO);

    expect(fila.woo_order_id).toBe(1234);
    expect(fila.numero_pedido).toBe("1234");
    expect(fila.cliente_nombre).toBe("Ana Rojas");
    expect(fila.total_centimos).toBe(1_500_000);
    expect(fila.estado_woo).toBe("on-hold");
  });

  it("interpreta date_created_gmt como UTC", () => {
    expect(mapearPedidoWoo(ORDEN_WOO).fecha_pedido).toBe("2026-09-01T10:00:00.000Z");
  });

  // La tienda devuelve el total sin decimales: "13195", no "13195.00".
  it("convierte un total sin decimales", () => {
    const sinDecimales = { ...ORDEN_WOO, total: "13195" };
    expect(mapearPedidoWoo(sinDecimales).total_centimos).toBe(1_319_500);
  });

  it("usa el correo cuando no hay nombre en el billing", () => {
    const sinNombre = {
      ...ORDEN_WOO,
      billing: { ...ORDEN_WOO.billing, first_name: "", last_name: "" },
    };
    expect(mapearPedidoWoo(sinNombre).cliente_nombre).toBe("ana@example.com");
  });

  it("usa un marcador cuando no hay ni nombre ni correo", () => {
    const anonimo = {
      ...ORDEN_WOO,
      billing: { first_name: "", last_name: "", email: "", phone: "" },
    };
    expect(mapearPedidoWoo(anonimo).cliente_nombre).toBe("Pedido #1234");
  });

  it("convierte teléfono y correo vacíos a null", () => {
    const anonimo = {
      ...ORDEN_WOO,
      billing: { first_name: "", last_name: "", email: "", phone: "" },
    };
    const fila = mapearPedidoWoo(anonimo);
    expect(fila.cliente_email).toBeNull();
    expect(fila.cliente_telefono).toBeNull();
  });

  it("guarda la orden completa en raw para poder re-procesar", () => {
    expect(mapearPedidoWoo(ORDEN_WOO).raw).toEqual(ORDEN_WOO);
  });
});

describe("estadoPagoInicial", () => {
  it("trata completed como cobrado", () => {
    expect(estadoPagoInicial("completed")).toBe("pagado");
  });

  it("trata processing y on-hold como deuda", () => {
    expect(estadoPagoInicial("processing")).toBe("pendiente");
    expect(estadoPagoInicial("on-hold")).toBe("pendiente");
    expect(estadoPagoInicial("pending")).toBe("pendiente");
  });

  it("saca de la deuda lo que la tienda anuló", () => {
    expect(estadoPagoInicial("cancelled")).toBe("anulado");
    expect(estadoPagoInicial("refunded")).toBe("anulado");
    expect(estadoPagoInicial("failed")).toBe("anulado");
  });

  it("asume deuda ante un estado desconocido", () => {
    expect(estadoPagoInicial("estado-de-un-plugin")).toBe("pendiente");
  });
});
