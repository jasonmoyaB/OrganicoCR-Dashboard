// Correr el extractor sobre un correo ya guardado y escribir lo que salga.
//
// Vive aparte de la captura porque no depende de IMAP: recibe el cuerpo que ya
// está en `correos_banco`, así que sirve igual para un correo recién bajado y
// para uno viejo que quedó a medias. Es lo que hace cierta la invariante 4 —
// guardar crudo antes de procesar solo vale si existe un camino para volver a
// procesar sin pedirle nada al banco.

import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { extraerPago } from "../_extractor/extraer-pago.ts";

export type ResultadoProceso = "extraido" | "no-aplica" | "sin-extraer";

export interface CorreoGuardado {
  id: number;
  mensajeId: string;
  remitente: string;
  cuerpo: string;
  recibidoAt: string;
}

const METODO = "regex";
// El extractor de expresiones regulares no estima: o lee el monto exacto o
// devuelve null. El respaldo LLM sí traerá una confianza de verdad.
const CONFIANZA_EXACTA = 1;

interface MarcaDeCorreo {
  procesado_ok: boolean;
  error?: string | null;
  motivo_sin_pago?: string | null;
}

// El error se mira siempre. Cuando no se miraba, una marca fallida devolvía
// éxito, el cursor avanzaba y el correo quedaba atrás para siempre: así se
// perdieron 36 correos el 2026-09-14, cuando la función salió a producción
// antes que la migración que creaba `motivo_sin_pago`.
async function marcarCorreo(supabase: SupabaseClient, id: number, campos: MarcaDeCorreo) {
  const { error } = await supabase.from("correos_banco").update(campos).eq("id", id);
  if (error) throw new Error(`No se pudo marcar el correo ${id}: ${error.message}`);
}

async function guardarPago(
  supabase: SupabaseClient,
  correo: CorreoGuardado,
  pago: { montoCentimos: number; remitenteNombre: string | null; referenciaDetalle: string | null },
) {
  const { error } = await supabase.from("pagos").upsert(
    {
      correo_id: correo.id,
      mensaje_id: correo.mensajeId,
      remitente_nombre: pago.remitenteNombre,
      monto_centimos: pago.montoCentimos,
      referencia_detalle: pago.referenciaDetalle,
      fecha_pago: correo.recibidoAt,
      metodo_extraccion: METODO,
      confianza_extraccion: CONFIANZA_EXACTA,
      cuerpo_correo: correo.cuerpo,
    },
    { onConflict: "mensaje_id", ignoreDuplicates: true },
  );

  if (error) throw new Error(`No se pudo guardar el pago: ${error.message}`);
}

export async function procesarCorreo(
  supabase: SupabaseClient,
  correo: CorreoGuardado,
): Promise<ResultadoProceso> {
  const resultado = extraerPago(correo.remitente, correo.cuerpo);

  if (resultado.clase === "desconocido") {
    await marcarCorreo(supabase, correo.id, {
      procesado_ok: false,
      error: "Ningún extractor reconoció el formato",
    });

    return "sin-extraer";
  }

  // Reconocido y sin cobro detrás: un egreso o un aviso en otra moneda. Se
  // marca como procesado para que no vuelva a intentarse en cada corrida, y el
  // motivo queda escrito por si algún día hay que revisar la decisión.
  if (resultado.clase === "no-aplica") {
    await marcarCorreo(supabase, correo.id, {
      procesado_ok: true,
      error: null,
      motivo_sin_pago: resultado.motivo,
    });

    return "no-aplica";
  }

  await guardarPago(supabase, correo, resultado.pago);
  await marcarCorreo(supabase, correo.id, { procesado_ok: true, error: null });

  return "extraido";
}
