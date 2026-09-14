import { useQuery } from "@tanstack/react-query";
import { ESTADO_PAGO } from "@/constants/estados-pago";
import { supabase } from "@/lib/supabase";
import { fetchPedidosPagados } from "../services/pedidos-pagados-service";

export const PEDIDOS_PAGADOS_KEY = ["pedidos", ESTADO_PAGO.PAGADO] as const;

export function usePedidosPagados() {
  const consulta = useQuery({
    queryKey: PEDIDOS_PAGADOS_KEY,
    queryFn: () => fetchPedidosPagados(supabase),
  });

  const pedidos = consulta.data ?? [];

  return {
    pedidos,
    totalCentimos: pedidos.reduce((suma, pedido) => suma + pedido.totalCentimos, 0),
    cargando: consulta.isLoading,
    error: consulta.error,
  };
}
