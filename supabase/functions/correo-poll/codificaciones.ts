// Codificaciones de transporte de MIME. Entran y salen cadenas de bytes (un
// byte por carácter, ver `bytes-texto.ts`): el charset se aplica después, en
// `charset.ts`, porque el correo declara las dos cosas por separado.

const ESPACIOS = /\s+/g;
const SALTO_SUAVE = /=(?:\r\n|\n|\r)/g;
const OCTETO = /=([0-9A-Fa-f]{2})/g;
const BASE64_VALIDO = /^[A-Za-z0-9+/]*={0,2}$/;

export function decodificarBase64(cadena: string): string {
  const limpio = cadena.replace(ESPACIOS, "");
  if (!BASE64_VALIDO.test(limpio)) {
    throw new Error("El cuerpo declara base64 pero trae caracteres fuera del alfabeto");
  }
  return atob(limpio);
}

// El guion bajo vale como espacio solo dentro de una palabra codificada de
// cabecera (RFC 2047 «Q»). En el cuerpo es un guion bajo de verdad, y
// confundirlos parte los nombres propios que llegan del banco.
export function decodificarQuotedPrintable(cadena: string, guionBajoEsEspacio = false): string {
  const sinSaltos = cadena.replace(SALTO_SUAVE, "");
  const conEspacios = guionBajoEsEspacio ? sinSaltos.replace(/_/g, " ") : sinSaltos;
  return conEspacios.replace(OCTETO, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)));
}
