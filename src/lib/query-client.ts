import { QueryClient } from "@tanstack/react-query";

const MS_FRESCOS = 30_000;
const MS_ENTRE_REFRESCOS = 60_000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: MS_FRESCOS,
      refetchOnWindowFocus: true,
      // Sin esto, una pestaña abierta y quieta muestra el estado de cuando se
      // cargó: el pago ya está en la base y la pantalla sigue diciendo que
      // deben. Nadie va a recargar a mano cada rato para enterarse.
      refetchInterval: MS_ENTRE_REFRESCOS,
      // Queda en false, que es el default: con la pestaña oculta el dueño no
      // está mirando, y el cron ya guardó el pago igual. Lo que avisa con la
      // app cerrada es la notificación push, no este intervalo.
      refetchIntervalInBackground: false,
    },
  },
});
