import type { SupabaseClienteApp } from "@/lib/supabase";
import { esMetodoExtraccion } from "@/utils/es-metodo-extraccion";
import type { Pago, PagoRow } from "../types/pago.types";

// Las columnas van explícitas y no con `*`: así `cuerpo_correo` nunca sale de
// la base. La lista y PagoRow tienen que coincidir — si se agrega una columna
// acá sin agregarla al tipo, el typecheck lo marca.
const COLUMNAS =
  "id, mensaje_id, remitente_nombre, monto_centimos, referencia_detalle, fecha_pago, metodo_extraccion, confianza_extraccion";

export function mapearPago(fila: PagoRow): Pago {
  if (!esMetodoExtraccion(fila.metodo_extraccion)) {
    throw new Error(
      `Método de extracción desconocido en el pago ${fila.mensaje_id}: ${fila.metodo_extraccion}`,
    );
  }

  return {
    id: fila.id,
    mensajeId: fila.mensaje_id,
    remitenteNombre: fila.remitente_nombre,
    montoCentimos: fila.monto_centimos,
    referenciaDetalle: fila.referencia_detalle,
    fechaPago: fila.fecha_pago,
    metodoExtraccion: fila.metodo_extraccion,
    confianzaExtraccion: fila.confianza_extraccion,
  };
}

export async function fetchPagos(cliente: SupabaseClienteApp): Promise<Pago[]> {
  const { data, error } = await cliente
    .from("pagos")
    .select(COLUMNAS)
    // Lo más reciente primero: al revés que en "Deben". Un pago viejo ya se
    // revisó; el que acaba de entrar es el que el dueño quiere ver.
    .order("fecha_pago", { ascending: false });

  if (error) throw new Error(`No se pudieron cargar los pagos: ${error.message}`);

  return data.map(mapearPago);
}

// El conteo sale por RPC y no por `count` sobre la tabla: correos_banco es
// deny-all justamente para que los cuerpos de los correos no salgan al
// navegador. La función security definer devuelve el número y nada más.
export async function contarCorreosSinProcesar(cliente: SupabaseClienteApp): Promise<number> {
  const { data, error } = await cliente.rpc("contar_correos_sin_procesar");

  if (error) throw new Error(`No se pudo contar los correos sin procesar: ${error.message}`);

  return data ?? 0;
}
