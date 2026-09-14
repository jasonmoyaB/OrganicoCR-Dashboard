// Cadena de bytes + charset declarado -> texto legible.

import { aBytes } from "./bytes-texto.ts";

const POR_DEFECTO = "utf-8";

// Un charset que el runtime no conoce hace que `TextDecoder` lance. Caer a
// windows-1252 y seguir es mejor que perder el correo entero: peor caso, unas
// tildes salen mal y el monto —que es ASCII— se lee igual.
const RESPALDO = "windows-1252";

export function decodificarTexto(cadenaDeBytes: string, charset: string | null): string {
  const datos = aBytes(cadenaDeBytes);
  try {
    return new TextDecoder(charset ?? POR_DEFECTO).decode(datos);
  } catch {
    return new TextDecoder(RESPALDO).decode(datos);
  }
}
