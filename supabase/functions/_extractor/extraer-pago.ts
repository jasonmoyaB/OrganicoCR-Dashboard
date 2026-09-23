import { direccionRemitente } from "./direccion-remitente.ts";
import { extraerBAC } from "./extraer-bac.ts";
import { extraerDavibank } from "./extraer-davibank.ts";
import { noAplica, type ResultadoExtraccion } from "./resultado-extraccion.ts";

type Extractor = (cuerpo: string) => ResultadoExtraccion;

// Un map y no un switch: sumar un banco es agregar una línea acá, sin tocar
// nada de lo que ya funciona.
const EXTRACTORES: Record<string, Extractor> = {
  "servicioalcliente@davibank.cr": extraerDavibank,
  "notificaciones@baccredomatic.cr": extraerBAC,
};

// Un remitente que no es exactamente un banco da `no-aplica` y no `desconocido`,
// porque `desconocido` es la puerta al respaldo LLM. `UID SEARCH FROM` en el
// buzón busca texto contenido, así que `servicioalcliente@davibank.cr.evil.test`
// entra igual. Si caía al LLM con un aviso inventado, el matcher lo
// auto-confirmaba: un pedido cobrado sin que entre un colón.
export function extraerPago(from: string, cuerpo: string): ResultadoExtraccion {
  const extractor = EXTRACTORES[direccionRemitente(from)];

  return extractor ? extractor(cuerpo) : noAplica("El remitente no es un banco conocido");
}
