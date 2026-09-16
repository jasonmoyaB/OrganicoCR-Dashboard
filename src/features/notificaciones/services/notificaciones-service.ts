import type { SupabaseClienteApp } from "@/lib/supabase";
import type { NotificacionPago, PagoNuevoRow } from "../types/notificacion.types";

// Las columnas van explícitas y no con `*`: así `cuerpo_correo` nunca sale de
// la base. Si se agrega una acá sin agregarla al tipo, el typecheck lo marca.
const COLUMNAS = "id, remitente_nombre, monto_centimos, referencia_detalle, created_at";

// Una campana es una bandeja corta, no un historial: el buzón tiene casi dos
// mil avisos del banco y traerlos todos cada minuto para dibujar diez es
// trabajo que se paga en cada refresco.
export const LIMITE_NOTIFICACIONES = 20;

export function mapearNotificacion(fila: PagoNuevoRow): NotificacionPago {
  return {
    id: fila.id,
    remitenteNombre: fila.remitente_nombre,
    montoCentimos: fila.monto_centimos,
    referenciaDetalle: fila.referencia_detalle,
    creadoEn: fila.created_at,
  };
}

export async function fetchPagosRecientes(
  cliente: SupabaseClienteApp,
): Promise<NotificacionPago[]> {
  const { data, error } = await cliente
    .from("pagos")
    .select(COLUMNAS)
    .order("created_at", { ascending: false })
    .limit(LIMITE_NOTIFICACIONES);

  if (error) {
    throw new Error(`No se pudieron cargar las notificaciones: ${error.message}`);
  }

  return data.map(mapearNotificacion);
}
