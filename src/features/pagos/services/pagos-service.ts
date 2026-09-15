import type { SupabaseClienteApp } from "@/lib/supabase";
import { SIN_LIMITE, type RangoFechas } from "@/utils/rango-fechas";
import { esMetodoExtraccion } from "@/utils/es-metodo-extraccion";
import type { Pago, PagoRow, PedidoDelPago } from "../types/pago.types";

// Las columnas van explícitas y no con `*`: así `cuerpo_correo` nunca sale de
// la base. La lista y PagoRow tienen que coincidir — si se agrega una columna
// acá sin agregarla al tipo, el typecheck lo marca.
const COLUMNAS = `
  id, mensaje_id, remitente_nombre, monto_centimos, referencia_detalle,
  fecha_pago, metodo_extraccion, confianza_extraccion,
  conciliaciones (estado, pedidos (numero_pedido, cliente_nombre))
`;

interface FilaConciliacion {
  estado: string;
  pedidos: { numero_pedido: string; cliente_nombre: string } | null;
}

function pedidoConfirmado(conciliaciones: FilaConciliacion[] | null): PedidoDelPago | null {
  const confirmada = (conciliaciones ?? []).find((fila) => fila.estado === "confirmado");
  if (!confirmada?.pedidos) return null;

  return {
    numeroPedido: confirmada.pedidos.numero_pedido,
    clienteNombre: confirmada.pedidos.cliente_nombre,
  };
}

export function mapearPago(fila: PagoRow, conciliaciones: FilaConciliacion[] | null = null): Pago {
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
    pedido: pedidoConfirmado(conciliaciones),
  };
}

// El filtro va en la consulta y no en el navegador: el buzón tiene casi dos
// mil avisos del banco y ese número solo crece. Traerlos todos para esconder
// la mayoría es trabajo que se paga en cada carga de la pantalla.
export async function fetchPagos(
  cliente: SupabaseClienteApp,
  rango: RangoFechas = SIN_LIMITE,
): Promise<Pago[]> {
  let consulta = cliente
    .from("pagos")
    .select(COLUMNAS)
    // Lo más reciente primero: al revés que en "Deben". Un pago viejo ya se
    // revisó; el que acaba de entrar es el que el dueño quiere ver.
    .order("fecha_pago", { ascending: false });

  if (rango.desde) consulta = consulta.gte("fecha_pago", rango.desde);
  if (rango.hasta) consulta = consulta.lte("fecha_pago", rango.hasta);

  const { data, error } = await consulta;

  if (error) throw new Error(`No se pudieron cargar los pagos: ${error.message}`);

  return data.map((fila) =>
    mapearPago(fila as PagoRow, (fila as { conciliaciones: FilaConciliacion[] | null }).conciliaciones),
  );
}

// El conteo sale por RPC y no por `count` sobre la tabla: correos_banco es
// deny-all justamente para que los cuerpos de los correos no salgan al
// navegador. La función security definer devuelve el número y nada más.
export async function contarCorreosSinProcesar(cliente: SupabaseClienteApp): Promise<number> {
  const { data, error } = await cliente.rpc("contar_correos_sin_procesar");

  if (error) throw new Error(`No se pudo contar los correos sin procesar: ${error.message}`);

  return data ?? 0;
}
