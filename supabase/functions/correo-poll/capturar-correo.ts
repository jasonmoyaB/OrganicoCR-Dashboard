// Guardar un correo y, recién después, intentar leerlo.
//
// El orden importa (invariante 4): la fila cruda de `correos_banco` se escribe
// primero y sobrevive pase lo que pase. Si el extractor no entiende el
// formato, el correo queda ahí con `procesado_ok = false` y se re-procesa
// cuando el extractor mejore, sin pedirle nada al banco.

import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import type { CorreoRecibido } from "./mensaje-rfc822.ts";
import { procesarCorreo, type ResultadoProceso } from "./procesar-correo.ts";

export type ResultadoCaptura = ResultadoProceso | "ya-estaba";

interface CorreoConClave extends CorreoRecibido {
  mensajeId: string;
  uid: number;
}

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

  return await procesarCorreo(supabase, {
    id: fila.id,
    mensajeId: correo.mensajeId,
    remitente: correo.remitente,
    cuerpo: correo.cuerpo,
    recibidoAt: recibido,
  });
}
