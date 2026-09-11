import { ESTADO_PAGO, type EstadoPago } from "@/constants/estados-pago";

const ESTADOS_VALIDOS: readonly string[] = Object.values(ESTADO_PAGO);

export function esEstadoPago(valor: string): valor is EstadoPago {
  return ESTADOS_VALIDOS.includes(valor);
}
