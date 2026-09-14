// Arma un CSV que Excel en español abre bien de doble clic.
//
// Dos decisiones que no son cosméticas:
//
// 1. Separador `;` y no `,`. Excel con locale español usa el punto y coma como
//    separador de listas; con coma mete toda la fila en una sola columna.
// 2. BOM al principio. Sin él, Excel lee el archivo como ANSI y los acentos y
//    el símbolo del colón salen como basura.
const SEPARADOR = ";";
const BOM = "\uFEFF";
const FIN_DE_LINEA = "\r\n";

// Una celda que arranca con uno de estos caracteres la interpreta Excel como
// fórmula. `referencia_detalle` es texto que escribe quien manda el pago, así
// que un "=HYPERLINK(...)" en el motivo de un SINPE llegaría a la hoja del
// dueño como fórmula viva. La comilla simple lo vuelve texto.
const ARRANQUE_DE_FORMULA = /^[=+\-@\t\r]/;

function celda(valor: string | number | null): string {
  const texto = valor === null ? "" : String(valor);
  const seguro = ARRANQUE_DE_FORMULA.test(texto) ? `'${texto}` : texto;

  // Las comillas se escapan duplicándolas, y el campo entero se entrecomilla
  // si trae separador, comillas o saltos: cualquiera de los tres correría la
  // columna sin avisar.
  return /[";\r\n]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro;
}

export function aCSV(encabezados: string[], filas: (string | number | null)[][]): string {
  const lineas = [encabezados, ...filas].map((fila) => fila.map(celda).join(SEPARADOR));

  return BOM + lineas.join(FIN_DE_LINEA) + FIN_DE_LINEA;
}
