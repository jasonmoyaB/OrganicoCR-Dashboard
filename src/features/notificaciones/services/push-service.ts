import type { SupabaseClienteApp } from "@/lib/supabase";

// `usuario_id` no se manda: lo pone el default `auth.uid()` de la tabla. Que lo
// eligiera el navegador sería pedirle al cliente que declare quién es.
function aFila(suscripcion: PushSubscription) {
  const { endpoint, keys } = suscripcion.toJSON();

  if (!endpoint || !keys?.p256dh || !keys.auth) {
    throw new Error("El navegador devolvió una suscripción incompleta");
  }

  return {
    endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
    agente: navigator.userAgent,
  };
}

// Upsert por `endpoint` y no insert: el navegador devuelve la misma suscripción
// cada vez que se la pide, así que activar dos veces desde el mismo teléfono
// tiene que dejar una fila, no dos. Con dos filas, cada pago llegaría duplicado.
export async function guardarSuscripcion(
  cliente: SupabaseClienteApp,
  suscripcion: PushSubscription,
): Promise<void> {
  const { error } = await cliente
    .from("suscripciones_push")
    .upsert(aFila(suscripcion), { onConflict: "endpoint" });

  if (error) {
    throw new Error(`No se pudo guardar la suscripción a notificaciones: ${error.message}`);
  }
}
