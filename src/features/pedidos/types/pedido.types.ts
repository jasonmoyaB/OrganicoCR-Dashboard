import type { EstadoPago } from "@/constants/estados-pago";
import type { Database } from "@/types/database.types";

// Solo lo que el dashboard muestra. `raw` trae el pedido entero de Woo, con la
// dirección de facturación, y no tiene por qué viajar al navegador.
export type PedidoRow = Pick<
  Database["public"]["Tables"]["pedidos"]["Row"],
  | "id"
  | "woo_order_id"
  | "numero_pedido"
  | "cliente_nombre"
  | "cliente_email"
  | "cliente_telefono"
  | "total_centimos"
  | "estado_woo"
  | "estado_pago"
  | "fecha_pedido"
>;

export interface Pedido {
  id: string;
  wooOrderId: number;
  numeroPedido: string;
  clienteNombre: string;
  clienteEmail: string | null;
  clienteTelefono: string | null;
  totalCentimos: number;
  estadoWoo: string;
  estadoPago: EstadoPago;
  fechaPedido: string;
}

// Cómo se cobró un pedido. Es opcional porque un pedido puede estar pagado sin
// que ningún pago del banco lo respalde: lo marcó el dueño a mano, o entró de
// WooCommerce ya en `completed`.
export interface PagoDelPedido {
  remitenteNombre: string | null;
  montoCentimos: number;
  fechaPago: string;
  referenciaDetalle: string | null;
}

export interface PedidoPagado extends Pedido {
  pago: PagoDelPedido | null;
}
