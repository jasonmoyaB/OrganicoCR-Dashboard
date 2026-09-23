import type { Database } from "@/types/database.types";

// Subconjunto a propósito, igual que en `PagoRow`: `cuerpo_correo` guarda el
// correo entero del banco y una campana no tiene nada que hacer con él.
export type PagoNuevoRow = Pick<
  Database["public"]["Tables"]["pagos"]["Row"],
  "id" | "remitente_nombre" | "monto_centimos" | "referencia_detalle" | "created_at"
>;

// `creadoEn` es cuándo entró la fila a la base, no la fecha que dice el banco.
// Son distintas: el cron lee el buzón cada 5 minutos y arrastra avisos viejos,
// así que un pago fechado la semana pasada puede ser noticia de hoy. Lo que la
// campana cuenta es lo que el dueño todavía no vio, y eso lo marca la llegada.
export interface NotificacionPago {
  id: string;
  remitenteNombre: string | null;
  montoCentimos: number;
  referenciaDetalle: string | null;
  creadoEn: string;
}
