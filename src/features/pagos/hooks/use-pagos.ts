import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { fetchPagos } from "../services/pagos-service";

// Se exporta para que la fase C invalide esta lista cuando el matcher consuma
// un pago, igual que PEDIDOS_PENDIENTES_KEY.
export const PAGOS_KEY = ["pagos"] as const;

export function usePagos() {
  const consulta = useQuery({
    queryKey: PAGOS_KEY,
    queryFn: () => fetchPagos(supabase),
  });

  return {
    pagos: consulta.data ?? [],
    cargando: consulta.isLoading,
    error: consulta.error,
  };
}
