import type { SupabaseClienteApp } from "@/lib/supabase";
import type { AlertaSistema } from "../types/alerta.types";

export async function fetchAlertasSistema(cliente: SupabaseClienteApp): Promise<AlertaSistema[]> {
  const { data, error } = await cliente
    .from("alertas_sistema")
    .select("origen, mensaje, desde")
    // La más vieja arriba: lleva más tiempo rota.
    .order("desde");

  if (error) throw new Error(`No se pudieron cargar las alertas del sistema: ${error.message}`);

  return data;
}
