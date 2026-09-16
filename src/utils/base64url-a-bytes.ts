// La llave pública VAPID viaja como base64url y `pushManager.subscribe` la pide
// en bytes. La spec permite pasar el string, pero no todos los navegadores lo
// aceptan: Firefox y Safari quieren el BufferSource.
//
// El tipo dice `Uint8Array<ArrayBuffer>` y no `Uint8Array` a secas porque desde
// TypeScript 5.7 los arreglos tipados son genéricos, y el default incluye
// `SharedArrayBuffer`, que `applicationServerKey` no acepta. Construir el
// arreglo por largo —en vez de `Uint8Array.from`— es lo que fija el genérico.
export function base64urlABytes(texto: string): Uint8Array<ArrayBuffer> {
  const relleno = "=".repeat((4 - (texto.length % 4)) % 4);
  const base64 = (texto + relleno).replaceAll("-", "+").replaceAll("_", "/");

  const binario = atob(base64);
  const bytes = new Uint8Array(binario.length);

  for (let indice = 0; indice < binario.length; indice += 1) {
    bytes[indice] = binario.charCodeAt(indice);
  }

  return bytes;
}
