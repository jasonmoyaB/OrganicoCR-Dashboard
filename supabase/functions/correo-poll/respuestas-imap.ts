// Parsers de las respuestas de texto del servidor IMAP. Puros y sin nada de
// Deno, así que corren bajo vitest igual que cualquier util de `src/`.

const SEARCH = /^\* SEARCH([\d ]*)$/m;
const UIDVALIDITY = /UIDVALIDITY (\d+)/;
const LITERAL = /\{(\d+)\}\r\n/;
const LITERAL_AL_FINAL = /\{(\d+)\}$/;
const DESENLACE = /^(OK|NO|BAD)\b/;
const FIN_DE_LINEA = "\r\n";
const INCOMPLETA = -1;

// Un byte, un carácter: así las posiciones del literal siguen valiendo sobre
// el arreglo de bytes original aunque el cuerpo traiga UTF-8.
const UN_BYTE_UN_CARACTER = new TextDecoder("ascii");

// Hasta dónde llega la respuesta a una orden, o -1 si todavía falta leer.
//
// No alcanza con buscar la etiqueta: el cuerpo de un correo puede contener una
// línea que se le parezca. Por eso, cada vez que una línea termina anunciando
// un literal `{N}`, se saltan esos N bytes sin mirarlos — que es exactamente
// lo que el servidor dijo que son, datos y no protocolo.
export function finDeRespuesta(datos: Uint8Array, etiqueta: string): number {
  const texto = UN_BYTE_UN_CARACTER.decode(datos);
  const cierre = `${etiqueta} `;
  let desde = 0;

  while (desde < texto.length) {
    const fin = texto.indexOf(FIN_DE_LINEA, desde);
    if (fin === INCOMPLETA) return INCOMPLETA;

    const linea = texto.slice(desde, fin);
    const literal = LITERAL_AL_FINAL.exec(linea);

    if (literal) desde = fin + FIN_DE_LINEA.length + Number(literal[1]);
    else if (linea.startsWith(cierre) && DESENLACE.test(linea.slice(cierre.length))) {
      return fin + FIN_DE_LINEA.length;
    } else desde = fin + FIN_DE_LINEA.length;
  }

  return INCOMPLETA;
}

export function uidsDe(respuesta: string): number[] {
  const encontrados = SEARCH.exec(respuesta);
  return (encontrados?.[1] ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(Number);
}

export function uidvalidityDe(respuesta: string): number {
  const encontrado = UIDVALIDITY.exec(respuesta);
  if (!encontrado) throw new Error("EXAMINE no devolvió UIDVALIDITY");
  return Number(encontrado[1]);
}

// El servidor anuncia el largo del cuerpo en BYTES con `{N}` y después manda
// ese bloque crudo. Cortar por líneas rompe cualquier correo que contenga una
// línea que parezca una respuesta IMAP, y contar caracteres en vez de bytes
// trunca los que traen tildes.
export function cuerpoDeFetch(respuesta: Uint8Array): Uint8Array {
  const cabecera = LITERAL.exec(UN_BYTE_UN_CARACTER.decode(respuesta));
  if (!cabecera) throw new Error("La respuesta de FETCH no trae un literal {N}");

  const inicio = cabecera.index + cabecera[0].length;
  const largo = Number(cabecera[1]);
  if (inicio + largo > respuesta.length) {
    throw new Error(`FETCH incompleto: se anunciaron ${largo} bytes y llegaron menos`);
  }

  return respuesta.subarray(inicio, inicio + largo);
}
