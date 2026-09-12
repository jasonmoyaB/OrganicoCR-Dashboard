import type { MetodoExtraccion } from "@/constants/metodos-extraccion";
import type { Database } from "@/types/database.types";

// Subconjunto a propósito: `cuerpo_correo` guarda el correo completo del banco
// y el dashboard no lo muestra. Traerlo al navegador solo ampliaría la
// superficie de datos personales expuestos sin ganar nada.
export type PagoRow = Pick<
  Database["public"]["Tables"]["pagos"]["Row"],
  | "id"
  | "gmail_message_id"
  | "remitente_nombre"
  | "monto_centimos"
  | "referencia_detalle"
  | "fecha_pago"
  | "metodo_extraccion"
  | "confianza_extraccion"
>;

export interface Pago {
  id: string;
  gmailMessageId: string;
  remitenteNombre: string | null;
  montoCentimos: number;
  referenciaDetalle: string | null;
  fechaPago: string;
  metodoExtraccion: MetodoExtraccion;
  confianzaExtraccion: number | null;
}
