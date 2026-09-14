import { normalizarMontoCRC } from "./normalizar-monto-crc.ts";
import type { PagoExtraido } from "./pago-extraido.ts";
import { PLANTILLAS } from "./plantillas-davibank.ts";

const ESPACIOS = /\s+/g;
// Davibank trunca el nombre a 20 caracteres y a veces separa con guion bajo en
// vez de espacio ("ANNIELLA_LI_DIAZ", "CONSULTORES_AGROAMBI"). El guion bajo se
// vuelve espacio acá para que el matcher compare contra `cliente_nombre` sin
// tropezar; el truncado no se puede deshacer, así que el matcher compara por
// similitud y no por igualdad.
const GUION_BAJO = /_/g;

function limpiarNombre(crudo: string): string {
  return crudo.replace(GUION_BAJO, " ").replace(ESPACIOS, " ").trim();
}

export function extraerDavibank(cuerpo: string): PagoExtraido | null {
  for (const { patron } of PLANTILLAS) {
    const encontrado = patron.exec(cuerpo);
    if (!encontrado?.groups) continue;

    const { monto, remitente, referencia } = encontrado.groups;

    try {
      return {
        montoCentimos: normalizarMontoCRC(monto),
        remitenteNombre: limpiarNombre(remitente),
        referenciaDetalle: referencia ? limpiarNombre(referencia) || null : null,
      };
    } catch {
      // La plantilla acertó pero el monto no se pudo interpretar. Se corta acá
      // en vez de seguir probando: un aviso reconocido a medias que cae en otra
      // plantilla inventaría una cifra. Devolver null lo manda al respaldo LLM.
      return null;
    }
  }

  return null;
}
