import { normalizarMontoCRC } from "./normalizar-monto-crc";
import type { PagoExtraido } from "./pago-extraido";

// Provisional: el patrón viene de cómo el dueño describió el aviso, no de un
// correo real todavía. Por eso es deliberadamente laxo en lo accesorio —verbo,
// espacios, acentos, símbolo de moneda— y estricto en lo que importa: si el
// monto no se puede leer, no se devuelve nada. Validar contra un correo de
// verdad antes de confiar en él; hasta entonces el respaldo LLM cubre el resto.
//
// `[\s\S]` en vez de `.` porque el aviso puede venir partido en varias líneas.
const AVISO_SINPE =
  /recib\w*\s+(?<monto>[\s\S]+?)\s*colones\s+de\s+(?<remitente>[^\n]+?)\s+al\s+sinpe/iu;

const ESPACIOS = /\s+/g;

export function extraerDavibank(cuerpo: string): PagoExtraido | null {
  const encontrado = AVISO_SINPE.exec(cuerpo);
  if (!encontrado?.groups) return null;

  const { monto, remitente } = encontrado.groups;

  try {
    return {
      montoCentimos: normalizarMontoCRC(monto),
      // El correo puede traer el nombre partido por saltos de línea o con
      // doble espacio; el matcher compara contra cliente_nombre por similitud
      // y los espacios de más bajan el score sin razón.
      remitenteNombre: remitente.replace(ESPACIOS, " ").trim(),
      // Davibank no manda campo de referencia. Ver R6.
      referenciaDetalle: null,
    };
  } catch {
    // El monto no se pudo interpretar. Devolver null lo manda al respaldo LLM
    // en vez de inventar una cifra.
    return null;
  }
}
