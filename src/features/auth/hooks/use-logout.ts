import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { cerrarSesion } from "../services/auth-service";

export function useLogout() {
  const queryClient = useQueryClient();
  const [saliendo, setSaliendo] = useState(false);

  async function salir() {
    setSaliendo(true);
    try {
      await cerrarSesion();
      // Sin esto, los pedidos del usuario anterior siguen en caché y se ven
      // por un instante en el próximo login.
      queryClient.clear();
    } finally {
      setSaliendo(false);
    }
  }

  return { salir, saliendo };
}
