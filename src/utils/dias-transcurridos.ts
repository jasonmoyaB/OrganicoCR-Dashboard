const MS_POR_DIA = 1000 * 60 * 60 * 24;

export function diasTranscurridos(fechaISO: string, ahora: Date = new Date()): number {
  const transcurrido = ahora.getTime() - new Date(fechaISO).getTime();
  if (transcurrido <= 0) return 0;
  return Math.floor(transcurrido / MS_POR_DIA);
}
