// Guardar un correo y, recién después, intentar leerlo.
//
// El orden importa (invariante 4): la fila cruda de `correos_banco` se escribe
// primero y sobrevive pase lo que pase. Si el extractor no entiende el
// formato, el correo queda ahí con `procesado_ok = false` y se re-procesa
// cuando el extractor mejore, sin pedirle nada al banco.

import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { extraerPago } from "../_extractor/extraer-pago.ts";
import type { CorreoRecibido } from "./mensaje-rfc822.ts";

export type ResultadoCaptura = "extraido" | "no-aplica" | "sin-extraer" | "ya-estaba";

interface CorreoConClave extends CorreoRecibido {
  mensajeId: string;
  uid: number;
}

const METODO = "regex";
// El extractor de expresiones regulares no estima: o lee el monto exacto o
// devuelve null. El respaldo LLM sí traerá una confianza de verdad.
const CONFIANZA_EXACTA = 1;

async function idDelCorreo(supabase: SupabaseClient, correo: CorreoConClave, recibido: string) {
  const { data, error } = await supabase
    .from("correos_banco")
    .upsert(
      {
        mensaje_id: correo.mensajeId,
        remitente: correo.remitente,
        asunto: correo.asunto,
        cuerpo: correo.cuerpo,
        recibido_at: recibido,
        uid_imap: correo.uid,
      },
      { onConflict: "mensaje_id", ignoreDuplicates: true },
    )
    .select("id, procesado_ok")
    .maybeSingle();

  if (error) throw new Error(`No se pudo guardar el correo: ${error.message}`);
  if (data) return data;

  // Ya existía. Se relee su estado en vez de darlo por procesado: una corrida
  // anterior pudo haberlo guardado y morir antes de extraer el pago.
  const existente = await supabase
    .from("correos_banco")
    .select("id, procesado_ok")
    .eq("mensaje_id", correo.mensajeId)
    .single();

  if (existente.error) throw new Error(`No se pudo releer el correo: ${existente.error.message}`);
  return existente.data;
}

export async function capturarCorreo(
  supabase: SupabaseClient,
  correo: CorreoConClave,
): Promise<ResultadoCaptura> {
  const recibido = (correo.fecha ?? new Date()).toISOString();
  const fila = await idDelCorreo(supabase, correo, recibido);
  if (fila.procesado_ok === true) return "ya-estaba";

  const resultado = extraerPago(correo.remitente, correo.cuerpo);

  if (resultado.clase === "desconocido") {
    await supabase
      .from("correos_banco")
      .update({ procesado_ok: false, error: "Ningún extractor reconoció el formato" })
      .eq("id", fila.id);

    return "sin-extraer";
  }

  // Reconocido y sin cobro detrás: un egreso o un aviso en otra moneda. Se
  // marca como procesado para que no vuelva a intentarse en cada corrida, y el
  // motivo queda escrito por si algún día hay que revisar la decisión.
  if (resultado.clase === "no-aplica") {
    await supabase
      .from("correos_banco")
      .update({ procesado_ok: true, error: null, motivo_sin_pago: resultado.motivo })
      .eq("id", fila.id);

    return "no-aplica";
  }

  const pago = resultado.pago;

  const { error } = await supabase.from("pagos").upsert(
    {
      correo_id: fila.id,
      mensaje_id: correo.mensajeId,
      remitente_nombre: pago.remitenteNombre,
      monto_centimos: pago.montoCentimos,
      referencia_detalle: pago.referenciaDetalle,
      fecha_pago: recibido,
      metodo_extraccion: METODO,
      confianza_extraccion: CONFIANZA_EXACTA,
      cuerpo_correo: correo.cuerpo,
    },
    { onConflict: "mensaje_id", ignoreDuplicates: true },
  );

  if (error) throw new Error(`No se pudo guardar el pago: ${error.message}`);

  await supabase
    .from("correos_banco")
    .update({ procesado_ok: true, error: null })
    .eq("id", fila.id);

  return "extraido";
}
