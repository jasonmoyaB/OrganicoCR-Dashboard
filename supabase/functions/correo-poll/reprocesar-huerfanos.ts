// Correos que se guardaron pero nunca se terminaron de procesar.
//
// Un `procesado_ok is null` dura lo que tarda la corrida que lo capturó: se
// escribe la fila cruda y enseguida se la marca. Si queda así, algo se cortó en
// el medio. Antes eso era definitivo, porque el cursor avanzaba igual; ahora
// cada corrida los recoge y los pasa de nuevo por el extractor, leyendo el
// cuerpo que ya está guardado.

import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { procesarCorreo } from "./procesar-correo.ts";

// Mismo criterio que LOTE_MAXIMO: acotado para no pasarse del timeout del cron.
// Si quedaran más, la corrida siguiente sigue donde esta dejó.
const LOTE_HUERFANOS = 50;

interface FilaHuerfana {
  id: number;
  mensaje_id: string;
  remitente: string;
  cuerpo: string;
  recibido_at: string;
  autenticacion: string | null;
}

export async function reprocesarHuerfanos(supabase: SupabaseClient): Promise<number> {
  // Usa el índice parcial `correos_banco_sin_procesar_idx`, hecho justamente
  // para esta consulta: cuando no hay huérfanos —el caso normal— no cuesta nada.
  const { data, error } = await supabase
    .from("correos_banco")
    .select("id, mensaje_id, remitente, cuerpo, recibido_at, autenticacion")
    .is("procesado_ok", null)
    .order("recibido_at")
    .limit(LOTE_HUERFANOS);

  if (error) throw new Error(`No se pudieron leer los correos a medias: ${error.message}`);

  for (const fila of (data ?? []) as FilaHuerfana[]) {
    await procesarCorreo(supabase, {
      id: fila.id,
      mensajeId: fila.mensaje_id,
      remitente: fila.remitente,
      cuerpo: fila.cuerpo,
      recibidoAt: fila.recibido_at,
      autenticacion: fila.autenticacion,
    });
  }

  return data?.length ?? 0;
}
