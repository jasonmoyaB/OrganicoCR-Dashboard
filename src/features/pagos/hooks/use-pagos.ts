import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { SIN_LIMITE, type RangoFechas } from "@/utils/rango-fechas";
import { fetchPagos } from "../services/pagos-service";

// Se exporta para que el matcher invalide esta lista cuando consuma un pago.
// El rango entra en la clave: cada tramo de fechas es una consulta distinta y
// TanStack Query cachea cada una por su lado, así que volver a "Hoy" después
// de mirar el mes no vuelve a pegarle a la base.
export const PAGOS_KEY = ["pagos"] as const;

export function usePagos(rango: RangoFechas = SIN_LIMITE) {
  const consulta = useQuery({
    queryKey: [...PAGOS_KEY, rango.desde, rango.hasta],
    queryFn: () => fetchPagos(supabase, rango),
    // Sin esto la tabla parpadea a "Cargando pagos…" en cada cambio de filtro.
    // Mostrar el tramo anterior mientras llega el nuevo se lee como un filtro
    // que responde, no como una pantalla que se recarga.
    placeholderData: (anterior) => anterior,
  });

  return {
    pagos: consulta.data ?? [],
    cargando: consulta.isLoading,
    error: consulta.error,
    reintentar: () => void consulta.refetch(),
  };
}
