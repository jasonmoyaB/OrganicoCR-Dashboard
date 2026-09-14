import type { PagoExtraido } from "./pago-extraido.ts";

// Tres desenlaces y no dos. Antes un correo o daba un pago o daba `null`, y
// bajo ese `null` caían dos cosas muy distintas: el aviso de un egreso, que es
// ruido esperado y no hay nada que hacer con él, y un formato que nadie supo
// leer, que sí necesita que alguien lo mire.
//
// Mezclarlos hacía que el dashboard avisara "47 correos sin procesar" cuando
// los 47 estaban correctamente descartados. Un aviso que siempre está
// encendido deja de ser un aviso.
export type ResultadoExtraccion =
  | { clase: "pago"; pago: PagoExtraido }
  | { clase: "no-aplica"; motivo: string }
  | { clase: "desconocido" };

export const NO_RECONOCIDO: ResultadoExtraccion = { clase: "desconocido" };

export function esPago(pago: PagoExtraido): ResultadoExtraccion {
  return { clase: "pago", pago };
}

export function noAplica(motivo: string): ResultadoExtraccion {
  return { clase: "no-aplica", motivo };
}

// Para quien solo le interesa el cobro y no por qué no lo hubo.
export function pagoDe(resultado: ResultadoExtraccion): PagoExtraido | null {
  return resultado.clase === "pago" ? resultado.pago : null;
}
