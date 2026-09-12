const LOCALE_CR = "es-CR";
const CENTIMOS_POR_COLON = 100;

// Cada `new Intl.NumberFormat` carga las tablas de datos del locale. Se
// construyen las dos variantes una sola vez al cargar el módulo, no una por
// llamada: esta función se llama una vez por fila de la tabla de pedidos.
const FORMATO_SIN_CENTIMOS = new Intl.NumberFormat(LOCALE_CR, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const FORMATO_CON_CENTIMOS = new Intl.NumberFormat(LOCALE_CR, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatColones(centimos: number): string {
  const tieneCentimos = centimos % CENTIMOS_POR_COLON !== 0;
  const formato = tieneCentimos ? FORMATO_CON_CENTIMOS : FORMATO_SIN_CENTIMOS;

  return `₡${formato.format(centimos / CENTIMOS_POR_COLON)}`;
}
