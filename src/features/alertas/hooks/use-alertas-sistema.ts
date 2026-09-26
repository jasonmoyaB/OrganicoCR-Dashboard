import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { fetchAlertasSistema } from "../services/alertas-service";

export const ALERTAS_SISTEMA_KEY = ["alertas-sistema"] as const;

export function useAlertasSistema() {
  const consulta = useQuery({
    queryKey: ALERTAS_SISTEMA_KEY,
    queryFn: () => fetchAlertasSistema(supabase),
  });

  // Si esta consulta falla, el aviso de conexión ya lo dice: no hace falta
  // una alerta sobre las alertas.
  return consulta.data ?? [];
}
