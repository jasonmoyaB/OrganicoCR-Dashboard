import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { fetchSugerencias, resolverConciliacion } from "../services/conciliaciones-service";

export const SUGERENCIAS_KEY = ["conciliaciones", "sugerido"] as const;

interface Resolucion {
  conciliacionId: string;
  confirmar: boolean;
}

export function useSugerencias() {
  const queryClient = useQueryClient();

  const consulta = useQuery({
    queryKey: SUGERENCIAS_KEY,
    queryFn: () => fetchSugerencias(supabase),
  });

  const mutacion = useMutation({
    mutationFn: ({ conciliacionId, confirmar }: Resolucion) =>
      resolverConciliacion(supabase, conciliacionId, confirmar),
    // Resolver una sugerencia mueve el pedido entre secciones, así que las
    // listas de pedidos quedan viejas. Invalidar todo `pedidos` es más barato
    // que enumerar cuáles: son cuatro queries de una tabla chica.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SUGERENCIAS_KEY });
      queryClient.invalidateQueries({ queryKey: ["pedidos"] });
    },
  });

  return {
    sugerencias: consulta.data ?? [],
    cargando: consulta.isLoading,
    error: consulta.error,
    resolver: mutacion.mutate,
    resolviendo: mutacion.isPending,
    errorAlResolver: mutacion.error,
  };
}
