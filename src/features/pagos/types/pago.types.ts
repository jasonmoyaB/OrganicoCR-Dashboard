import type { MetodoExtraccion } from "@/constants/metodos-extraccion";
import type { Database } from "@/types/database.types";

// Subconjunto a propósito: `cuerpo_correo` guarda el correo completo del banco
// y el dashboard no lo muestra. Traerlo al navegador solo ampliaría la
// superficie de datos personales expuestos sin ganar nada.
export type PagoRow = Pick<
  Database["public"]["Tables"]["pagos"]["Row"],
  | "id"
  | "mensaje_id"
  | "remitente_nombre"
  | "monto_centimos"
  | "referencia_detalle"
  | "fecha_pago"
  | "metodo_extraccion"
  | "confianza_extraccion"
>;

// El pedido que este pago terminó cubriendo, si lo cubrió. Null significa que
// todavía nadie lo cruzó, o que no hay pedido de la tienda que le corresponda:
// los encargos que entran por WhatsApp se pagan igual pero nunca pasaron por
// WooCommerce, así que no tienen contra qué cuadrar.
export interface PedidoDelPago {
  numeroPedido: string;
  clienteNombre: string;
}

export interface Pago {
  id: string;
  mensajeId: string;
  remitenteNombre: string | null;
  montoCentimos: number;
  referenciaDetalle: string | null;
  fechaPago: string;
  metodoExtraccion: MetodoExtraccion;
  confianzaExtraccion: number | null;
  pedido: PedidoDelPago | null;
}
