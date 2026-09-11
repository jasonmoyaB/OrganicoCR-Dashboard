import { QueryClient } from "@tanstack/react-query";

const SEGUNDOS_FRESCOS = 30_000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: SEGUNDOS_FRESCOS,
      refetchOnWindowFocus: true,
    },
  },
});
