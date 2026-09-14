// Costa Rica es UTC-6 todo el año: no usa horario de verano desde 1992, así
// que el offset es una constante y no hace falta una tabla de zonas. Se
// desplaza el instante y se leen los componentes en UTC, en vez de usar
// Intl.DateTimeFormat: el resultado no depende del reloj de quien mira ni de
// la versión de ICU del navegador.
const OFFSET_CR_MS = -6 * 60 * 60 * 1000;

export function dosDigitos(valor: number): string {
  return String(valor).padStart(2, "0");
}

export function enHoraCR(fechaISO: string): Date {
  const instante = new Date(fechaISO);

  if (Number.isNaN(instante.getTime())) {
    throw new Error(`Fecha inválida: ${fechaISO}`);
  }

  return new Date(instante.getTime() + OFFSET_CR_MS);
}

// El día calendario en Costa Rica, no en UTC. Un pago de las 19:00 del lunes
// hora tica son las 01:00 del martes en UTC: agrupar por el instante crudo
// mandaría los pagos de la tarde al reporte del día siguiente.
export function diaCR(fechaISO: string): string {
  const cr = enHoraCR(fechaISO);

  return `${cr.getUTCFullYear()}-${dosDigitos(cr.getUTCMonth() + 1)}-${dosDigitos(cr.getUTCDate())}`;
}
