import { ESTADO_PAGO, type EstadoPago } from "@/constants/estados-pago";
import type { SupabaseClienteApp } from "@/lib/supabase";
import { esEstadoPago } from "@/utils/es-estado-pago";
import type { Pedido, PedidoRow } from "../types/pedido.types";

export function mapearPedido(fila: PedidoRow): Pedido {
  if (!esEstadoPago(fila.estado_pago)) {
    throw new Error(
      `Estado de pago desconocido en el pedido ${fila.numero_pedido}: ${fila.estado_pago}`,
    );
  }

  return {
    id: fila.id,
    wooOrderId: fila.woo_order_id,
    numeroPedido: fila.numero_pedido,
    clienteNombre: fila.cliente_nombre,
    clienteEmail: fila.cliente_email,
    clienteTelefono: fila.cliente_telefono,
    totalCentimos: fila.total_centimos,
    estadoWoo: fila.estado_woo,
    estadoPago: fila.estado_pago,
    fechaPedido: fila.fecha_pedido,
  };
}

export async function fetchPedidosPorEstado(
  cliente: SupabaseClienteApp,
  estado: EstadoPago,
): Promise<Pedido[]> {
  const { data, error } = await cliente
    .from("pedidos")
    .select("*")
    .eq("estado_pago", estado)
    // Lo más viejo primero: un pedido de hace tres semanas pesa más que uno de ayer.
    .order("fecha_pedido", { ascending: true });

  if (error) throw new Error(`No se pudieron cargar los pedidos: ${error.message}`);

  return data.map(mapearPedido);
}

export async function marcarPedidoPagado(
  cliente: SupabaseClienteApp,
  pedidoId: string,
): Promise<void> {
  const { error } = await cliente
    .from("pedidos")
    .update({ estado_pago: ESTADO_PAGO.PAGADO })
    .eq("id", pedidoId);

  if (error) throw new Error(`No se pudo marcar como pagado: ${error.message}`);
}
