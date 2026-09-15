import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { resumenCorreosSinProcesar } from "../services/pagos-service";

export const CORREOS_SIN_PROCESAR_KEY = ["correos-sin-procesar"] as const;

const VACIO = { cantidad: 0, masViejo: null };

// Query aparte de usePagos a propósito. El caso que este contador diagnostica
// es justamente "hay correos entrando y ningún pago saliendo": si compartiera
// consulta con la lista de pagos, un fallo en esa lista se llevaría el
// contador y taparía la señal.
export function useCorreosSinProcesar() {
  const consulta = useQuery({
    queryKey: CORREOS_SIN_PROCESAR_KEY,
    queryFn: () => resumenCorreosSinProcesar(supabase),
  });

  return { resumen: consulta.data ?? VACIO, cargando: consulta.isLoading };
}
