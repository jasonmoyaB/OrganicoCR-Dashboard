// Avisos del servidor al dashboard (tabla `alertas_sistema`). Cada función
// avisa con su origen cuando algo deja de andar y lo resuelve cuando vuelve.

import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

// Nunca tiran: avisar de un problema no puede convertirse en otro. Si la que
// falla es la base, la alerta tampoco se escribe y queda solo el log.
export async function avisar(supabase: SupabaseClient, origen: string, mensaje: string) {
  const { error } = await supabase
    .from("alertas_sistema")
    .upsert({ origen, mensaje, actualizado_at: new Date().toISOString() });

  if (error) console.error(`No se pudo guardar la alerta "${origen}":`, error.message);
}

export async function resolver(supabase: SupabaseClient, origen: string) {
  const { error } = await supabase.from("alertas_sistema").delete().eq("origen", origen);

  if (error) console.error(`No se pudo borrar la alerta "${origen}":`, error.message);
}
