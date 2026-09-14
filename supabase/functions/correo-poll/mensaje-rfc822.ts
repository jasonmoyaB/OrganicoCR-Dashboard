// Mensaje crudo de IMAP -> los campos que necesita `correos_banco`.

import { aCadenaDeBytes } from "./bytes-texto.ts";
import { decodificarPalabras, partirMensaje } from "./cabeceras-rfc822.ts";
import { textoDeMensaje } from "./parte-mime.ts";

export interface CorreoRecibido {
  // Puede faltar: un correo sin `Message-ID` es raro pero legal. Quien
  // orquesta decide con qué reemplazarlo, porque la clave de idempotencia es
  // una decisión de la captura, no del parseo.
  mensajeId: string | null;
  remitente: string;
  asunto: string | null;
  // Null si el correo no trae `Date` o lo trae ilegible. No se inventa una
  // fecha acá: `fecha_pago` alimenta la ventana de tiempo del matching.
  fecha: Date | null;
  cuerpo: string;
}

function fechaDe(cabecera: string | undefined): Date | null {
  if (!cabecera) return null;

  const fecha = new Date(cabecera);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

function decodificada(cabecera: string | undefined): string | null {
  return cabecera ? decodificarPalabras(cabecera) : null;
}

export function parsearCorreo(crudo: Uint8Array): CorreoRecibido {
  const { cabeceras, cuerpo } = partirMensaje(aCadenaDeBytes(crudo));

  return {
    mensajeId: cabeceras.get("message-id") ?? null,
    // El `From` va entero, con nombre y dirección: `extraer-pago.ts` se queda
    // con la dirección y el nombre sirve para auditar en `correos_banco`.
    remitente: decodificada(cabeceras.get("from")) ?? "",
    asunto: decodificada(cabeceras.get("subject")),
    fecha: fechaDe(cabeceras.get("date")),
    cuerpo: textoDeMensaje(cabeceras, cuerpo),
  };
}
