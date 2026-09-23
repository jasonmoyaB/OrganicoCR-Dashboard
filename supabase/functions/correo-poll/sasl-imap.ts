// Cómo se le presenta la credencial al servidor IMAP. Puro: arma las cadenas,
// no las manda.

const CODIFICADOR = new TextEncoder();
const NUL = "\0";
const A_ESCAPAR = /(["\\])/g;
// oxlint-disable-next-line no-control-regex -- detectarlos es justamente el punto
const CONTROL = /[\x00-\x1f\x7f]/;

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
//
// Un quoted-string de IMAP tampoco admite CR ni LF: para esos el protocolo
// exige un literal con el largo por delante. En vez de implementarlo se
// rechaza, porque un salto de línea dentro de un argumento es exactamente lo
// que convierte una orden en dos.
export function entrecomillar(valor: string): string {
  if (CONTROL.test(valor)) {
    throw new Error("Un argumento de IMAP no puede llevar caracteres de control");
  }

  return `"${valor.replace(A_ESCAPAR, "\\$1")}"`;
}

// Dovecot anuncia AUTH=PLAIN; otros servidores IMAP solo aceptan la orden
// LOGIN. Se elige según lo que el servidor dice soportar, no por suposición.
export function soportaPlain(capacidades: string): boolean {
  return capacidades.toUpperCase().includes("AUTH=PLAIN");
}
