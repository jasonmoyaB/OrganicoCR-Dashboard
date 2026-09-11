// La firma se calcula SIEMPRE sobre el cuerpo crudo, nunca sobre el JSON
// re-serializado: JSON.stringify(JSON.parse(x)) puede reordenar claves o
// cambiar el escapado, y entonces toda firma legítima se rechaza.
export async function verificarFirma(
  cuerpoCrudo: string,
  firmaRecibida: string | null,
  secreto: string,
): Promise<boolean> {
  if (!firmaRecibida) return false;

  const firmaBytes = decodificarBase64(firmaRecibida);
  if (!firmaBytes) return false;

  const codificador = new TextEncoder();
  const clave = await crypto.subtle.importKey(
    "raw",
    codificador.encode(secreto),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );

  // subtle.verify y no comparar strings con ===: la comparación nativa es de
  // tiempo constante, y una con === filtra por cuántos caracteres coinciden.
  return crypto.subtle.verify("HMAC", clave, firmaBytes, codificador.encode(cuerpoCrudo));
}

function decodificarBase64(valor: string): Uint8Array | null {
  try {
    return Uint8Array.from(atob(valor), (caracter) => caracter.charCodeAt(0));
  } catch {
    return null;
  }
}
