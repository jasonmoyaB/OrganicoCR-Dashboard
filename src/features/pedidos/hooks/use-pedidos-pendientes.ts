import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ESTADO_PAGO } from "@/constants/estados-pago";
import { supabase } from "@/lib/supabase";
import { fetchPedidosPorEstado, marcarPedidoPagado } from "../services/pedidos-service";

// Se exporta para que la Fase C invalide esta query cuando el matcher
// confirme un pago. Es uno de los dos ganchos hacia adelante de la Fase A.
export const PEDIDOS_PENDIENTES_KEY = ["pedidos", ESTADO_PAGO.PENDIENTE] as const;

export function usePedidosPendientes() {
  const queryClient = useQueryClient();

  const consulta = useQuery({
    queryKey: PEDIDOS_PENDIENTES_KEY,
    queryFn: () => fetchPedidosPorEstado(supabase, ESTADO_PAGO.PENDIENTE),
  });

  const mutacion = useMutation({
    mutationFn: (pedidoId: string) => marcarPedidoPagado(supabase, pedidoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PEDIDOS_PENDIENTES_KEY });
    },
  });

  const pedidos = consulta.data ?? [];
  // Derivado de los datos, no presentación: por eso vive acá y no en el componente.
  const totalCentimos = pedidos.reduce((suma, pedido) => suma + pedido.totalCentimos, 0);

  return {
    pedidos,
    totalCentimos,
    cargando: consulta.isLoading,
    error: consulta.error,
    marcarPagado: mutacion.mutate,
    marcandoPagado: mutacion.isPending,
  };
}
