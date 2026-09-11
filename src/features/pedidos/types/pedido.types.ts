import type { EstadoPago } from "@/constants/estados-pago";
import type { Database } from "@/types/database.types";

export type PedidoRow = Database["public"]["Tables"]["pedidos"]["Row"];

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
