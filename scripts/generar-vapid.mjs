// Genera el par de llaves VAPID de las notificaciones push.
//
//   node scripts/generar-vapid.mjs
//
// Se corre UNA vez por entorno y el resultado se guarda a mano. Regenerarlas
// invalida todas las suscripciones que ya existen: los navegadores quedan
// suscritos con la llave vieja y el servicio de push rechaza los avisos
// firmados con la nueva. Si hay que rotarlas, hay que vaciar
// `suscripciones_push` y volver a pedirle permiso a cada dispositivo.

import { webcrypto } from "node:crypto";

const CURVA = { name: "ECDSA", namedCurve: "P-256" };

const par = await webcrypto.subtle.generateKey(CURVA, true, ["sign", "verify"]);

const publicKey = await webcrypto.subtle.exportKey("jwk", par.publicKey);
const privateKey = await webcrypto.subtle.exportKey("jwk", par.privateKey);

// La "application server key" que pide `pushManager.subscribe` es el punto
// P-256 sin comprimir —0x04 y las dos coordenadas— en base64url. 65 bytes.
const crudo = Buffer.from(await webcrypto.subtle.exportKey("raw", par.publicKey));

console.log(`
--- .env.local (lo lee el navegador; es pública por diseño) ---

VITE_VAPID_PUBLIC_KEY=${crudo.toString("base64url")}

--- supabase/functions/.env (nunca sale del servidor) ---

VAPID_CONTACTO=mailto:info@organicocr.store
VAPID_KEYS=${JSON.stringify({ publicKey, privateKey })}

En producción, las dos de abajo se cargan con:
  supabase secrets set VAPID_CONTACTO=... VAPID_KEYS='...'
`);
