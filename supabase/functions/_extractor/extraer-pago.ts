import { direccionRemitente } from "./direccion-remitente";
import { extraerDavibank } from "./extraer-davibank";
import type { PagoExtraido } from "./pago-extraido";

type Extractor = (cuerpo: string) => PagoExtraido | null;

// Un map y no un switch: sumar un banco es agregar una línea acá, sin tocar
// nada de lo que ya funciona. Falta el BAC — el dueño confirmó que también
// recibe avisos de ahí, pero todavía no se conoce ni su remitente ni su
// plantilla. Hasta que se sepa, sus correos caen al respaldo LLM.
const EXTRACTORES: Record<string, Extractor> = {
  "servicioalcliente@davibank.cr": extraerDavibank,
};

export function extraerPago(from: string, cuerpo: string): PagoExtraido | null {
  const extractor = EXTRACTORES[direccionRemitente(from)];

  return extractor ? extractor(cuerpo) : null;
}
