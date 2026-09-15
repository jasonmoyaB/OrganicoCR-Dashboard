import { RANGO, type Rango } from "@/constants/rangos-fecha";
import { diaCR, dosDigitos } from "./fecha-cr";

const OFFSET_CR_MS = -6 * 60 * 60 * 1000;
const MS_POR_DIA = 24 * 60 * 60 * 1000;

// Null en cualquiera de los dos extremos significa "sin límite de ese lado".
export interface RangoFechas {
  desde: string | null;
  hasta: string | null;
}

export const SIN_LIMITE: RangoFechas = { desde: null, hasta: null };

// El filtro se elige por día de Costa Rica pero `fecha_pago` se guarda en UTC:
// "hoy" para Hernán arranca a las 06:00 UTC y termina a las 05:59:59 del día
// siguiente. Comparar contra el día UTC dejaría fuera los pagos de la tarde.
export function inicioDelDiaCR(dia: string): string {
  return new Date(Date.parse(`${dia}T00:00:00Z`) - OFFSET_CR_MS).toISOString();
}

export function finDelDiaCR(dia: string): string {
  return new Date(Date.parse(`${dia}T23:59:59.999Z`) - OFFSET_CR_MS).toISOString();
}

function sumarDias(dia: string, dias: number): string {
  const corrido = new Date(Date.parse(`${dia}T00:00:00Z`) + dias * MS_POR_DIA);

  return `${corrido.getUTCFullYear()}-${dosDigitos(corrido.getUTCMonth() + 1)}-${dosDigitos(corrido.getUTCDate())}`;
}

function primeroDelMes(dia: string): string {
  return `${dia.slice(0, 7)}-01`;
}

// `ahora` entra por parámetro en vez de leerse adentro: una función que
// consulta el reloj no se puede testear sin congelar el tiempo.
export function rangoDe(rango: Rango, ahora: Date = new Date()): RangoFechas {
  const hoy = diaCR(ahora.toISOString());

  const desdeHasta: Partial<Record<Rango, [string, string]>> = {
    [RANGO.HOY]: [hoy, hoy],
    [RANGO.AYER]: [sumarDias(hoy, -1), sumarDias(hoy, -1)],
    // Siete días contando hoy, no hoy más siete: "últimos 7 días" incluye el
    // de hoy, que es el que más se mira.
    [RANGO.SIETE_DIAS]: [sumarDias(hoy, -6), hoy],
    [RANGO.ESTE_MES]: [primeroDelMes(hoy), hoy],
  };

  const limites = desdeHasta[rango];
  if (!limites) return SIN_LIMITE;

  return { desde: inicioDelDiaCR(limites[0]), hasta: finDelDiaCR(limites[1]) };
}

// Lo que escriben los dos campos de fecha, que vienen como "YYYY-MM-DD".
export function rangoPersonalizado(desde: string, hasta: string): RangoFechas {
  return {
    desde: desde ? inicioDelDiaCR(desde) : null,
    hasta: hasta ? finDelDiaCR(hasta) : null,
  };
}

// Para poner el valor inicial de los campos cuando se pasa a personalizado.
export function diaDeHoyCR(ahora: Date = new Date()): string {
  return diaCR(ahora.toISOString());
}
