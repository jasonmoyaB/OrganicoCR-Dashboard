// Lo que contestó el modelo -> el mismo `ResultadoExtraccion` que devuelve el
// regex.
//
// Vive aparte de `extraer-con-llm.ts` porque acá no hay red, ni SDK, ni
// `Deno.env`: es la parte que decide si se registra plata o no, y quería poder
// probarla con `pnpm test` sin hablar con nadie.

import { normalizarMontoCRC } from "../_extractor/normalizar-monto-crc.ts";
import {
  esPago,
  noAplica,
  NO_RECONOCIDO,
  type ResultadoExtraccion,
} from "../_extractor/resultado-extraccion.ts";

export const MONEDA = "CRC";

// Por debajo de esto el correo queda `procesado_ok = false`, igual que antes de
// que existiera el respaldo: visible en el dashboard, sin inventar un pago.
// Registrar plata que no entró esconde una deuda para siempre; quedarse corto
// solo deja una fila para mirar.
export const CONFIANZA_MINIMA = 0.9;

export interface RespuestaLlm {
  clase: "pago" | "no-aplica" | "desconocido";
  motivo: string;
  monto_texto: string | null;
  moneda: string | null;
  remitente_nombre: string | null;
  referencia_detalle: string | null;
  confianza: number;
}

export function leerRespuestaLlm(leido: RespuestaLlm): ResultadoExtraccion {
  if (leido.clase === "no-aplica") return noAplica(leido.motivo);
  if (leido.clase !== "pago") return NO_RECONOCIDO;

  // Poco seguro es lo mismo que ilegible: no se guarda nada y alguien lo mira.
  if (leido.confianza < CONFIANZA_MINIMA) return NO_RECONOCIDO;

  // El banco avisa ingresos en dólares con la misma redacción que en colones.
  // Leerlos como colones los haría cuadrar con el pedido equivocado.
  if (leido.moneda !== MONEDA) return noAplica(`Ingreso en ${leido.moneda ?? "moneda desconocida"}`);
  if (!leido.monto_texto) return NO_RECONOCIDO;

  return esPago({
    // Tira si el texto no es un monto legible, y quien llama lo convierte en
    // `desconocido`. Preferible a guardar una cifra que nadie validó.
    montoCentimos: normalizarMontoCRC(leido.monto_texto),
    remitenteNombre: leido.remitente_nombre,
    referenciaDetalle: leido.referencia_detalle,
  });
}
