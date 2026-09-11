// WooCommerce hace una entrega de prueba al activar un webhook: cuerpo
// `webhook_id=N`, form-encoded, y SIN cabecera de firma. Si no recibe un 200
// se niega a activarlo con
//   "Error: La URL de entrega devolvió un código de respuesta: 401"
//
// El patrón es deliberadamente estricto y anclado. Este cuerpo es el único que
// la función responde sin verificar el HMAC, así que nada que lleve un campo
// extra puede colarse por acá.
const CUERPO_PING = /^webhook_id=\d+$/;

export function esPingDeWoo(cuerpoCrudo: string): boolean {
  return CUERPO_PING.test(cuerpoCrudo.trim());
}
