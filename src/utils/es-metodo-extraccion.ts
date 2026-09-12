import { METODO_EXTRACCION, type MetodoExtraccion } from "@/constants/metodos-extraccion";

const METODOS_VALIDOS: readonly string[] = Object.values(METODO_EXTRACCION);

export function esMetodoExtraccion(valor: string): valor is MetodoExtraccion {
  return METODOS_VALIDOS.includes(valor);
}
