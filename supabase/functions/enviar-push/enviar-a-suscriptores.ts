import * as webpush from "jsr:@negrel/webpush@^0.5.0";
import type { AvisoPush } from "./mensaje-pago.ts";

// El transporte. Cifra el aviso con la llave del navegador (RFC 8291) y lo
// firma con las nuestras (RFC 8292): el servicio de push de Google o Apple
// mueve el mensaje sin poder leerlo.

export interface SuscripcionPush {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export type ResultadoEnvio = "enviado" | "vencida" | "falla";

export function abrirServidor(
  llavesVapid: string,
  contacto: string,
): Promise<webpush.ApplicationServer> {
  return webpush
    .importVapidKeys(JSON.parse(llavesVapid), { extractable: false })
    .then((vapidKeys) =>
      webpush.ApplicationServer.new({
        // RFC 8292 exige un mailto: o un https:. Es a quién le escribe el
        // servicio de push si nuestros avisos empiezan a dar problemas.
        contactInformation: contacto,
        vapidKeys,
      })
    );
}

export async function enviarAviso(
  servidor: webpush.ApplicationServer,
  suscripcion: SuscripcionPush,
  aviso: AvisoPush,
): Promise<ResultadoEnvio> {
  try {
    await servidor
      .subscribe({
        endpoint: suscripcion.endpoint,
        expirationTime: null,
        keys: { p256dh: suscripcion.p256dh, auth: suscripcion.auth },
      })
      .pushTextMessage(JSON.stringify(aviso), {});

    return "enviado";
  } catch (error) {
    // 404 o 410: desinstalaron la app, limpiaron los datos del navegador o
    // revocaron el permiso. Esa fila ya no sirve; dejarla viva hace que cada
    // pago futuro gaste un intento contra un endpoint muerto.
    if (error instanceof webpush.PushMessageError && error.isGone()) return "vencida";

    // Una falla de un dispositivo no puede llevarse el aviso de los demás, así
    // que se registra y se sigue.
    console.error(`Push fallido a ${suscripcion.endpoint}:`, (error as Error).message);
    return "falla";
  }
}
