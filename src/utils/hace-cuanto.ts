const MS_POR_MINUTO = 60 * 1000;
const MS_POR_HORA = 60 * MS_POR_MINUTO;
const MS_POR_DIA = 24 * MS_POR_HORA;

// `ahora` entra por parámetro, igual que en `dias-transcurridos`: una función
// que consulta el reloj por su cuenta no se puede testear sin congelar el tiempo.
export function haceCuanto(fechaISO: string, ahora: Date = new Date()): string {
  const instante = Date.parse(fechaISO);

  if (Number.isNaN(instante)) {
    throw new Error(`Fecha inválida: ${fechaISO}`);
  }

  // Un pago con fecha en el futuro —reloj del servidor adelantado— se lee como
  // recién llegado. "en 3 minutos" en una campana de avisos no significa nada.
  const transcurrido = Math.max(0, ahora.getTime() - instante);

  if (transcurrido < MS_POR_MINUTO) return "hace un momento";
  if (transcurrido < MS_POR_HORA) return `hace ${Math.floor(transcurrido / MS_POR_MINUTO)} min`;
  if (transcurrido < MS_POR_DIA) return `hace ${Math.floor(transcurrido / MS_POR_HORA)} h`;

  const dias = Math.floor(transcurrido / MS_POR_DIA);

  return dias === 1 ? "hace 1 día" : `hace ${dias} días`;
}
