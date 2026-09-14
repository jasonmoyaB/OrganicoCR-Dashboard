// Conversión sin pérdida entre bytes y cadena, un byte por carácter.
//
// No sirve `TextDecoder("latin1")`: el estándar lo trata como alias de
// windows-1252, que remapea 0x80-0x9F a otros puntos de código y rompe el
// viaje de ida y vuelta. Este par sí lo conserva, que es lo que hace falta
// para partir un correo en cabeceras y cuerpo antes de saber su charset.

const TAMANO_TROZO = 8192;

export function aCadenaDeBytes(datos: Uint8Array): string {
  let salida = "";
  for (let i = 0; i < datos.length; i += TAMANO_TROZO) {
    salida += String.fromCharCode(...datos.subarray(i, i + TAMANO_TROZO));
  }
  return salida;
}

export function aBytes(cadena: string): Uint8Array {
  return Uint8Array.from(cadena, (caracter) => caracter.charCodeAt(0) & 0xff);
}
