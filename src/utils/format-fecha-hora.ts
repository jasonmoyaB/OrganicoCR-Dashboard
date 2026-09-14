import { dosDigitos, enHoraCR } from "./fecha-cr";

export function formatFechaHora(fechaISO: string): string {
  const cr = enHoraCR(fechaISO);
  const fecha = `${dosDigitos(cr.getUTCDate())}/${dosDigitos(cr.getUTCMonth() + 1)}/${cr.getUTCFullYear()}`;

  return `${fecha} ${dosDigitos(cr.getUTCHours())}:${dosDigitos(cr.getUTCMinutes())}`;
}

// Solo el día, para los encabezados del reporte diario: "lunes 14/09/2026".
const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

export function formatDiaLargo(fechaISO: string): string {
  const cr = enHoraCR(fechaISO);
  const fecha = `${dosDigitos(cr.getUTCDate())}/${dosDigitos(cr.getUTCMonth() + 1)}/${cr.getUTCFullYear()}`;

  return `${DIAS[cr.getUTCDay()]} ${fecha}`;
}
