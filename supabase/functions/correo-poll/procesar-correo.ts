// Correr el extractor sobre un correo ya guardado y escribir lo que salga.
//
// Vive aparte de la captura porque no depende de IMAP: recibe el cuerpo que ya
// está en `correos_banco`, así que sirve igual para un correo recién bajado y
// para uno viejo que quedó a medias. Es lo que hace cierta la invariante 4 —
// guardar crudo antes de procesar solo vale si existe un camino para volver a
// procesar sin pedirle nada al banco.

import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { extraerPago } from "../_extractor/extraer-pago.ts";
import type { ResultadoExtraccion } from "../_extractor/resultado-extraccion.ts";
import { veredictoDe } from "./autenticacion-correo.ts";
import { extraerConLlm } from "./extraer-con-llm.ts";

export type ResultadoProceso = "extraido" | "no-aplica" | "sin-extraer";

export interface CorreoGuardado {
  id: number;
  mensajeId: string;
  remitente: string;
  cuerpo: string;
  recibidoAt: string;
  // Null para los correos capturados antes de que se guardara la cabecera, y
  // para los que el servidor entregó sin dictaminar nada.
  autenticacion: string | null;
}

// Qué leyó el correo y con cuánta certeza. El regex no estima: o lee el monto
// exacto o no devuelve pago. El respaldo LLM sí trae una confianza de verdad.
interface Extraccion {
  resultado: ResultadoExtraccion;
  metodo: "regex" | "llm";
  confianza: number;
}

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
  extraccion: Extraccion & { resultado: { clase: "pago" } },
) {
  const { pago } = extraccion.resultado;

  const { error } = await supabase.from("pagos").upsert(
    {
      correo_id: correo.id,
      mensaje_id: correo.mensajeId,
      remitente_nombre: pago.remitenteNombre,
      monto_centimos: pago.montoCentimos,
      referencia_detalle: pago.referenciaDetalle,
      fecha_pago: correo.recibidoAt,
      metodo_extraccion: extraccion.metodo,
      confianza_extraccion: extraccion.confianza,
      cuerpo_correo: correo.cuerpo,
    },
    { onConflict: "mensaje_id", ignoreDuplicates: true },
  );

  if (error) throw new Error(`No se pudo guardar el pago: ${error.message}`);
}

async function escribirExtraccion(
  supabase: SupabaseClient,
  correo: CorreoGuardado,
  extraccion: Extraccion,
): Promise<ResultadoProceso> {
  const { resultado } = extraccion;

  // Nadie supo leerlo: ni el regex ni el respaldo. Es el único caso que
  // enciende el contador de "correos sin procesar" del dashboard.
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

  await guardarPago(supabase, correo, { ...extraccion, resultado });
  await marcarCorreo(supabase, correo.id, { procesado_ok: true, error: null });

  return "extraido";
}

export async function procesarCorreo(
  supabase: SupabaseClient,
  correo: CorreoGuardado,
): Promise<ResultadoProceso> {
  // Antes de leer el monto: si el servidor que lo entregó dijo que el correo no
  // es de quien dice ser, no hay nada que extraer. El `From` lo escribe quien
  // manda, y un SINPE Móvil falsificado con monto exacto y número de pedido es
  // el caso que el matcher auto-confirma solo.
  //
  // Se descarta como "no-aplica" y no como "sin-extraer": el formato se entiende
  // perfectamente: lo que no se acepta es el remitente. `procesado_ok = false`
  // significa una sola cosa —nadie supo leerlo— y meter esto ahí encendería el
  // cartel de "correos sin leer" para algo que sí se leyó y se rechazó.
  if (veredictoDe(correo.autenticacion) === "falla") {
    await marcarCorreo(supabase, correo.id, {
      procesado_ok: true,
      error: null,
      motivo_sin_pago: "El servidor de correo rechazó la autenticación del remitente",
    });

    return "no-aplica";
  }

  const resultado = extraerPago(correo.remitente, correo.cuerpo);

  if (resultado.clase !== "desconocido") {
    return await escribirExtraccion(supabase, correo, {
      resultado,
      metodo: "regex",
      confianza: CONFIANZA_EXACTA,
    });
  }

  // El regex no lo reconoció. Última parada antes de dejarlo para revisión a
  // mano: preguntarle al modelo. Si no hay clave, si se acabó el presupuesto de
  // la corrida o si la llamada falla, vuelve `desconocido` y todo queda igual.
  const respaldo = await extraerConLlm(correo.remitente, correo.cuerpo);

  return await escribirExtraccion(supabase, correo, { ...respaldo, metodo: "llm" });
}
