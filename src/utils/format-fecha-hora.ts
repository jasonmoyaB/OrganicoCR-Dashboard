// Costa Rica es UTC-6 todo el año: no usa horario de verano desde 1992, así
// que el offset es una constante y no hace falta una tabla de zonas. Se
// desplaza el instante y se leen los componentes en UTC, en vez de usar
// Intl.DateTimeFormat: el resultado no depende del reloj de quien mira ni de
// la versión de ICU del navegador.
const OFFSET_CR_MS = -6 * 60 * 60 * 1000;

function dosDigitos(valor: number): string {
  return String(valor).padStart(2, "0");
}

export function formatFechaHora(fechaISO: string): string {
  const instante = new Date(fechaISO);

  if (Number.isNaN(instante.getTime())) {
    throw new Error(`Fecha inválida: ${fechaISO}`);
  }

  const cr = new Date(instante.getTime() + OFFSET_CR_MS);
  const fecha = `${dosDigitos(cr.getUTCDate())}/${dosDigitos(cr.getUTCMonth() + 1)}/${cr.getUTCFullYear()}`;

  return `${fecha} ${dosDigitos(cr.getUTCHours())}:${dosDigitos(cr.getUTCMinutes())}`;
}
