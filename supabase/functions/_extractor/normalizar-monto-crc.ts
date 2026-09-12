// El banco escribe los montos para humanos: "₡12.036,00". `Number()` no sirve
// —devuelve NaN con la coma y, peor, convierte "12.036" en 12.036, o sea 1204
// céntimos en vez de 1_203_600. Un error así no rompe nada visiblemente: solo
// hace que el monto no cuadre con ningún pedido y el pago quede sin conciliar.
const SOBRANTE = /[^\d.,]/g;
const SOLO_DIGITOS = /^\d+$/;
const CENTIMOS_POR_COLON = 100;
const DIGITOS_DE_MILES = 3;

function centimos(enteros: string, decimales: string, original: string): number {
  if (!SOLO_DIGITOS.test(enteros)) {
    throw new Error(`Monto inválido: ${original}`);
  }

  return Number(enteros) * CENTIMOS_POR_COLON + Number(decimales.padEnd(2, "0"));
}

export function normalizarMontoCRC(texto: string): number {
  const limpio = texto.replace(SOBRANTE, "");
  const corte = Math.max(limpio.lastIndexOf("."), limpio.lastIndexOf(","));

  if (corte === -1) return centimos(limpio, "0", texto);

  // Lo que haya antes del último separador es parte entera sí o sí: cualquier
  // separador previo solo puede ser de miles.
  const enteros = limpio.slice(0, corte).replace(/[.,]/g, "");
  const cola = limpio.slice(corte + 1);

  if (!SOLO_DIGITOS.test(cola)) {
    throw new Error(`Monto inválido: ${texto}`);
  }

  // Tres dígitos detrás del separador no pueden ser decimales: el colón no
  // tiene milésimas. Es un separador de miles y la cifra es entera.
  if (cola.length === DIGITOS_DE_MILES) return centimos(enteros + cola, "0", texto);

  if (cola.length > 2) throw new Error(`Monto inválido: ${texto}`);

  return centimos(enteros, cola, texto);
}
