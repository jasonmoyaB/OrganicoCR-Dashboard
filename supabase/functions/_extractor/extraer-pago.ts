import { direccionRemitente } from "./direccion-remitente.ts";
import { extraerBAC } from "./extraer-bac.ts";
import { extraerDavibank } from "./extraer-davibank.ts";
import { NO_RECONOCIDO, type ResultadoExtraccion } from "./resultado-extraccion.ts";

type Extractor = (cuerpo: string) => ResultadoExtraccion;

// Un map y no un switch: sumar un banco es agregar una línea acá, sin tocar
// nada de lo que ya funciona.
const EXTRACTORES: Record<string, Extractor> = {
  "servicioalcliente@davibank.cr": extraerDavibank,
  "notificaciones@baccredomatic.cr": extraerBAC,
};

export function extraerPago(from: string, cuerpo: string): ResultadoExtraccion {
  const extractor = EXTRACTORES[direccionRemitente(from)];

  return extractor ? extractor(cuerpo) : NO_RECONOCIDO;
}
