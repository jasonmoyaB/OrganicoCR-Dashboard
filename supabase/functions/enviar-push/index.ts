import { createClient } from "jsr:@supabase/supabase-js@2";
import { avisar, resolver } from "../_alertas/alertas.ts";
import { vieneDeLaBase } from "../_auth/viene-de-la-base.ts";
import {
  abrirServidor,
  enviarAviso,
  type ResultadoEnvio,
  type SuscripcionPush,
} from "./enviar-a-suscriptores.ts";
import { mensajeDePago, type PagoParaAvisar } from "./mensaje-pago.ts";

function leerEnv(clave: string): string {
  const valor = Deno.env.get(clave);
  if (!valor) throw new Error(`Falta la variable de entorno ${clave}`);
  return valor;
}

const supabase = createClient(leerEnv("SUPABASE_URL"), leerEnv("SUPABASE_SERVICE_ROLE_KEY"));

const COLUMNAS_PAGO = "id, monto_centimos, remitente_nombre, referencia_detalle";
const COLUMNAS_SUSCRIPCION = "id, endpoint, p256dh, auth";

async function leerPago(pagoId: string): Promise<PagoParaAvisar> {
  const { data, error } = await supabase
    .from("pagos")
    .select(COLUMNAS_PAGO)
    .eq("id", pagoId)
    .single();

  if (error) throw new Error(`No se pudo leer el pago ${pagoId}: ${error.message}`);

  return data as PagoParaAvisar;
}

async function leerSuscripciones(): Promise<SuscripcionPush[]> {
  const { data, error } = await supabase.from("suscripciones_push").select(COLUMNAS_SUSCRIPCION);

  if (error) throw new Error(`No se pudieron leer las suscripciones: ${error.message}`);

  return data as SuscripcionPush[];
}

function idsCon(suscripciones: SuscripcionPush[], resultados: ResultadoEnvio[]) {
  return (buscado: ResultadoEnvio) =>
    suscripciones.filter((_, indice) => resultados[indice] === buscado).map(({ id }) => id);
}

async function anotarResultados(
  suscripciones: SuscripcionPush[],
  resultados: ResultadoEnvio[],
): Promise<void> {
  const con = idsCon(suscripciones, resultados);
  const vencidas = con("vencida");
  const enviadas = con("enviado");

  if (vencidas.length > 0) {
    await supabase.from("suscripciones_push").delete().in("id", vencidas);
  }

  if (enviadas.length > 0) {
    await supabase
      .from("suscripciones_push")
      .update({ ultimo_envio_at: new Date().toISOString() })
      .in("id", enviadas);
  }
}

const MENSAJE_PUSH_CAIDO =
  "Las notificaciones de pago al teléfono no están llegando. Los pagos se siguen registrando igual; solo falta el aviso.";

// Con que llegue a un dispositivo alcanza para dar el push por sano: el que
// falla solo puede ser un teléfono viejo. Si no llegó a ninguno, el dueño no
// se entera de los pagos y hay que decírselo en el dashboard.
async function anotarSalud(enviados: number, fallas: number) {
  if (enviados > 0) return await resolver(supabase, "push");
  if (fallas > 0) await avisar(supabase, "push", MENSAJE_PUSH_CAIDO);
}

async function avisarPago(pagoId: string) {
  const suscripciones = await leerSuscripciones();

  // Sin dispositivos que avisar no hace falta leer el pago ni firmar nada.
  if (suscripciones.length === 0) return { enviados: 0, vencidas: 0, fallas: 0 };

  const aviso = mensajeDePago(await leerPago(pagoId));
  const servidor = await abrirServidor(leerEnv("VAPID_KEYS"), leerEnv("VAPID_CONTACTO"));

  const resultados = await Promise.all(
    suscripciones.map((suscripcion) => enviarAviso(servidor, suscripcion, aviso)),
  );

  await anotarResultados(suscripciones, resultados);
  const con = idsCon(suscripciones, resultados);
  await anotarSalud(con("enviado").length, con("falla").length);

  return {
    enviados: con("enviado").length,
    vencidas: con("vencida").length,
    fallas: con("falla").length,
  };
}

Deno.serve(async (pedido) => {
  if (!vieneDeLaBase(pedido)) {
    return Response.json({ error: "Solo la base dispara avisos" }, { status: 401 });
  }

  try {
    const cuerpo = (await pedido.json()) as { pago_id?: string };
    if (!cuerpo.pago_id) return Response.json({ error: "Falta pago_id" }, { status: 400 });

    return Response.json(await avisarPago(cuerpo.pago_id));
  } catch (error) {
    const motivo = (error as Error).message;
    console.error("enviar-push falló:", motivo);
    await avisar(supabase, "push", `${MENSAJE_PUSH_CAIDO} Motivo: ${motivo}`);

    // 500 para que el intento quede como fallido y no pase por bueno en
    // silencio: un aviso que no llegó es un pago que el dueño no vio.
    return Response.json({ error: motivo }, { status: 500 });
  }
});
