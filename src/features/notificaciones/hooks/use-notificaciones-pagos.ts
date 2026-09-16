import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { fetchPagosRecientes } from "../services/notificaciones-service";
import {
  guardarVisto,
  marcaDeVisto,
  marcaTrasLimpiar,
  sinVer,
} from "../services/visto-notificaciones";

export const NOTIFICACIONES_KEY = ["notificaciones-pagos"] as const;

// El +1 no lo dispara nada: la consulta hereda el `refetchInterval` de 60 s del
// cliente de Query, así que una pestaña abierta se entera sola de cada pago que
// entra. Con la pestaña oculta el que avisa es el push, no este intervalo.
export function useNotificacionesPagos() {
  const [visto, setVisto] = useState(marcaDeVisto);

  const consulta = useQuery({
    queryKey: NOTIFICACIONES_KEY,
    queryFn: () => fetchPagosRecientes(supabase),
  });

  // Memoizado y no `consulta.data ?? []` suelto: la lista vacía sería un
  // arreglo nuevo en cada render y `limpiar` cambiaría de identidad con él.
  const recientes = useMemo(() => consulta.data ?? [], [consulta.data]);
  // La campana muestra lo que el dueño todavía no vio, no el historial: para
  // eso está la sección "Pagos", y así limpiar deja la bandeja de verdad vacía.
  const notificaciones = sinVer(recientes, visto);

  const limpiar = useCallback(() => {
    const marca = marcaTrasLimpiar(recientes, visto);

    guardarVisto(marca);
    setVisto(marca);
  }, [recientes, visto]);

  return { notificaciones, limpiar, cargando: consulta.isLoading, error: consulta.error };
}
