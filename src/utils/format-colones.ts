const LOCALE_CR = "es-CR";

export function formatColones(centimos: number): string {
  const colones = centimos / 100;
  const tieneCentimos = centimos % 100 !== 0;

  const numero = new Intl.NumberFormat(LOCALE_CR, {
    minimumFractionDigits: tieneCentimos ? 2 : 0,
    maximumFractionDigits: tieneCentimos ? 2 : 0,
  }).format(colones);

  return `₡${numero}`;
}
