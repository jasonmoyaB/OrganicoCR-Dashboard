export function montoACentimos(monto: string): number {
  if (monto.trim() === "") return 0;

  const valor = Number(monto);
  if (Number.isNaN(valor)) {
    throw new Error(`Monto inválido: ${monto}`);
  }

  return Math.round(valor * 100);
}
