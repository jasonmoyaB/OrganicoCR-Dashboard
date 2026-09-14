import type { SupabaseClienteApp } from "@/lib/supabase";
import type { DesgloseScore, Sugerencia } from "../types/conciliacion.types";

// El join trae pedido y pago en una sola vuelta: mostrar la sugerencia sin los
// dos lados es pedirle al dueño que confirme a ciegas.
const COLUMNAS = `
  id, score, desglose,
  pedidos!inner (id, numero_pedido, cliente_nombre, total_centimos, fecha_pedido),
  pagos!inner (id, remitente_nombre, monto_centimos, referencia_detalle, fecha_pago)
`;

interface FilaSugerencia {
  id: string;
  score: number;
  desglose: unknown;
  pedidos: {
    id: string;
    numero_pedido: string;
    cliente_nombre: string;
    total_centimos: number;
    fecha_pedido: string;
  };
  pagos: {
    id: string;
    remitente_nombre: string | null;
    monto_centimos: number;
    referencia_detalle: string | null;
    fecha_pago: string;
  };
}

// El desglose llega como jsonb, o sea `unknown`. Un campo que falte se lee como
// 0 en vez de romper la pantalla: la sugerencia sigue siendo útil sin él.
function mapearDesglose(crudo: unknown): DesgloseScore {
  const valores = (crudo ?? {}) as Record<string, unknown>;
  const numero = (clave: string) =>
    typeof valores[clave] === "number" ? (valores[clave] as number) : 0;

  return {
    monto: numero("monto"),
    nombre: numero("nombre"),
    tiempo: numero("tiempo"),
    referencia: numero("referencia"),
  };
}

function mapearSugerencia(fila: FilaSugerencia): Sugerencia {
  return {
    id: fila.id,
    score: fila.score,
    desglose: mapearDesglose(fila.desglose),
    pedidoId: fila.pedidos.id,
    numeroPedido: fila.pedidos.numero_pedido,
    clienteNombre: fila.pedidos.cliente_nombre,
    totalCentimos: fila.pedidos.total_centimos,
    fechaPedido: fila.pedidos.fecha_pedido,
    pagoId: fila.pagos.id,
    remitenteNombre: fila.pagos.remitente_nombre,
    montoCentimos: fila.pagos.monto_centimos,
    referenciaDetalle: fila.pagos.referencia_detalle,
    fechaPago: fila.pagos.fecha_pago,
  };
}

export async function fetchSugerencias(cliente: SupabaseClienteApp): Promise<Sugerencia[]> {
  const { data, error } = await cliente
    .from("conciliaciones")
    .select(COLUMNAS)
    .eq("estado", "sugerido")
    // La más convincente primero: así lo que se despacha de un vistazo queda arriba.
    .order("score", { ascending: false });

  if (error) throw new Error(`No se pudieron cargar las sugerencias: ${error.message}`);

  return (data as unknown as FilaSugerencia[]).map(mapearSugerencia);
}

// Una función y no dos updates: marcar el pedido pagado y que después falle la
// conciliación dejaría un cobro sin pago que lo respalde.
export async function resolverConciliacion(
  cliente: SupabaseClienteApp,
  conciliacionId: string,
  confirmar: boolean,
): Promise<void> {
  const { error } = await cliente.rpc("resolver_conciliacion", {
    p_conciliacion_id: conciliacionId,
    p_confirmar: confirmar,
  });

  if (error) throw new Error(`No se pudo resolver la conciliación: ${error.message}`);
}
