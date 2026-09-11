export const ESTADO_PAGO = {
  PENDIENTE: "pendiente",
  REVISAR: "revisar",
  PAGADO: "pagado",
  ANULADO: "anulado",
} as const;

export type EstadoPago = (typeof ESTADO_PAGO)[keyof typeof ESTADO_PAGO];
