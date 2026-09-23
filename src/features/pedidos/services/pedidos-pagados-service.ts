import type { SupabaseClienteApp } from "@/lib/supabase";
import type { PagoDelPedido, PedidoPagado } from "../types/pedido.types";
import { COLUMNAS_PEDIDO, mapearPedido } from "./pedidos-service";

// `left join` y no `inner`: un pedido puede estar pagado sin pago del banco
// detrás —marcado a mano, o llegado de WooCommerce ya en `completed`— y
// esconderlo de "Pagaron" haría que el dueño lo buscara donde ya no está.
const COLUMNAS = `
  ${COLUMNAS_PEDIDO},
  conciliaciones (
    estado,
    pagos (remitente_nombre, monto_centimos, fecha_pago, referencia_detalle)
  )
`;

interface FilaConciliacion {
  estado: string;
  pagos: {
    remitente_nombre: string | null;
    monto_centimos: number;
    fecha_pago: string;
    referencia_detalle: string | null;
  } | null;
}

function pagoConfirmado(conciliaciones: FilaConciliacion[] | null): PagoDelPedido | null {
  const confirmada = (conciliaciones ?? []).find((fila) => fila.estado === "confirmado");
  if (!confirmada?.pagos) return null;

  return {
    remitenteNombre: confirmada.pagos.remitente_nombre,
    montoCentimos: confirmada.pagos.monto_centimos,
    fechaPago: confirmada.pagos.fecha_pago,
    referenciaDetalle: confirmada.pagos.referencia_detalle,
  };
}

export async function fetchPedidosPagados(cliente: SupabaseClienteApp): Promise<PedidoPagado[]> {
  const { data, error } = await cliente
    .from("pedidos")
    .select(COLUMNAS)
    .eq("estado_pago", "pagado")
    // Lo más reciente primero: al revés que "Deben", donde lo viejo es lo que
    // aprieta. Acá lo último cobrado es lo que se quiere ver.
    .order("fecha_pedido", { ascending: false });

  if (error) throw new Error(`No se pudieron cargar los pedidos pagados: ${error.message}`);

  return data.map((fila) => ({
    ...mapearPedido(fila as never),
    pago: pagoConfirmado((fila as { conciliaciones: FilaConciliacion[] | null }).conciliaciones),
  }));
}
