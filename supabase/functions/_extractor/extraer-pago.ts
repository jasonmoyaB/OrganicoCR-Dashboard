import { direccionRemitente } from "./direccion-remitente.ts";
import { extraerDavibank } from "./extraer-davibank.ts";
import type { PagoExtraido } from "./pago-extraido.ts";

type Extractor = (cuerpo: string) => PagoExtraido | null;

// Un map y no un switch: sumar un banco es agregar una línea acá, sin tocar
// nada de lo que ya funciona. Falta el BAC: su remitente ya se conoce
// —`notificaciones@baccredomatic.cr`, y `correo-poll` los captura— pero su
// plantilla todavía no está escrita, así que sus correos quedan en
// `correos_banco` sin procesar hasta que exista el extractor o el respaldo LLM.
// Cuidado al escribirlo: el BAC usa la misma redacción para los débitos
// salientes que para los ingresos, y confundirlos inventaría cobros.
const EXTRACTORES: Record<string, Extractor> = {
  "servicioalcliente@davibank.cr": extraerDavibank,
};

export function extraerPago(from: string, cuerpo: string): PagoExtraido | null {
  const extractor = EXTRACTORES[direccionRemitente(from)];

  return extractor ? extractor(cuerpo) : null;
}
