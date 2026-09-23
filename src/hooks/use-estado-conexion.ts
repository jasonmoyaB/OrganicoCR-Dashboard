import { useCallback, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { explicarError } from "@/utils/explicar-error";

function suscribirRed(avisar: () => void) {
  window.addEventListener("online", avisar);
  window.addEventListener("offline", avisar);

  return () => {
    window.removeEventListener("online", avisar);
    window.removeEventListener("offline", avisar);
  };
}

// Separa "no tenés internet" de "la base no responde": son dos arreglos
// distintos, y solo el primero está en manos del dueño. La base se da por
// caída cuando alguna consulta falló por conexión; TanStack reintenta cada
// minuto, así que el aviso se apaga solo cuando vuelve.
export function useEstadoConexion() {
  const cache = useQueryClient().getQueryCache();

  const sinInternet = useSyncExternalStore(suscribirRed, () => !navigator.onLine);

  const suscribirCache = useCallback((avisar: () => void) => cache.subscribe(avisar), [cache]);
  const baseCaida = useSyncExternalStore(suscribirCache, () =>
    cache
      .getAll()
      .some(({ state }) => state.status === "error" && explicarError(state.error).deConexion),
  );

  return { sinInternet, baseCaida: baseCaida && !sinInternet };
}
