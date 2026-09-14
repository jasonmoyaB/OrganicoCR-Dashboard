// Cómo se le presenta la credencial al servidor IMAP. Puro: arma las cadenas,
// no las manda.

const CODIFICADOR = new TextEncoder();
const NUL = "\0";
const A_ESCAPAR = /(["\\])/g;

function aCadenaDeBytes(datos: Uint8Array): string {
  return String.fromCharCode(...datos);
}

// SASL PLAIN (RFC 4616): usuario y clave separados por NUL, todo en base64.
// Así una contraseña con comillas o backslashes no necesita escaparse.
export function tokenPlain(usuario: string, clave: string): string {
  return btoa(aCadenaDeBytes(CODIFICADOR.encode(`${NUL}${usuario}${NUL}${clave}`)));
}

// La orden LOGIN sí manda la clave como argumento, y ahí una comilla sin
// escapar rompe la orden o —peor— la convierte en otra.
export function entrecomillar(valor: string): string {
  return `"${valor.replace(A_ESCAPAR, "\\$1")}"`;
}

// Dovecot anuncia AUTH=PLAIN; otros servidores IMAP solo aceptan la orden
// LOGIN. Se elige según lo que el servidor dice soportar, no por suposición.
export function soportaPlain(capacidades: string): boolean {
  return capacidades.toUpperCase().includes("AUTH=PLAIN");
}
