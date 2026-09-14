// Cuerpo HTML -> texto plano. Los avisos del banco suelen venir solo en HTML,
// y el extractor busca el monto con una expresión regular sobre texto: sin
// despojar las etiquetas, `<b>12.036</b>` no se parece a un monto.

const BLOQUES_INVISIBLES = /<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi;
const SALTOS = /<\/(p|div|tr|li|h[1-6])\s*>|<br\s*\/?>/gi;
const ETIQUETAS = /<[^>]*>/g;
const ENTIDAD_NOMBRADA = /&(nbsp|amp|lt|gt|quot|apos|aacute|eacute|iacute|oacute|uacute|ntilde);/gi;
const ENTIDAD_NUMERICA = /&#(x[0-9a-f]+|\d+);/gi;
const ESPACIOS_HORIZONTALES = /[^\S\n]+/g;
const SALTOS_DE_SOBRA = /\n{3,}/g;

const NOMBRADAS: Record<string, string> = {
  nbsp: " ",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  aacute: "á",
  eacute: "é",
  iacute: "í",
  oacute: "ó",
  uacute: "ú",
  ntilde: "ñ",
};

function resolverEntidades(texto: string): string {
  return texto
    .replace(ENTIDAD_NOMBRADA, (todo, nombre: string) => NOMBRADAS[nombre.toLowerCase()] ?? todo)
    .replace(ENTIDAD_NUMERICA, (todo, codigo: string) => {
      const punto = codigo[0].toLowerCase() === "x"
        ? Number.parseInt(codigo.slice(1), 16)
        : Number.parseInt(codigo, 10);

      return Number.isFinite(punto) ? String.fromCodePoint(punto) : todo;
    });
}

export function textoDeHtml(html: string): string {
  const sinInvisibles = html.replace(BLOQUES_INVISIBLES, " ");
  const conSaltos = sinInvisibles.replace(SALTOS, "\n");
  const sinEtiquetas = conSaltos.replace(ETIQUETAS, "");

  return resolverEntidades(sinEtiquetas)
    .replace(ESPACIOS_HORIZONTALES, " ")
    .replace(SALTOS_DE_SOBRA, "\n\n")
    .trim();
}
