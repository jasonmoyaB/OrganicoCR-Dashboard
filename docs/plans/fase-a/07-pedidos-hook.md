« [Fase A](README.md)

# 07 · Hook de pedidos pendientes

**Produce:** `usePedidosPendientes` — query, total, y mutación de marcado manual.

**Files:**
- Create: `src/features/pedidos/hooks/use-pedidos-pendientes.ts`

- [ ] **Step 1: Implementar el hook**

`src/features/pedidos/hooks/use-pedidos-pendientes.ts`:

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ESTADO_PAGO } from "@/constants/estados-pago";
import { supabase } from "@/lib/supabase";
import {
  fetchPedidosPorEstado,
  marcarPedidoPagado,
} from "../services/pedidos-service";

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
  const totalCentimos = pedidos.reduce((suma, p) => suma + p.totalCentimos, 0);

  return {
    pedidos,
    totalCentimos,
    cargando: consulta.isLoading,
    error: consulta.error,
    marcarPagado: mutacion.mutate,
    marcandoPagado: mutacion.isPending,
  };
}
```

`PEDIDOS_PENDIENTES_KEY` se exporta para que la Fase C pueda invalidar esta query cuando el matcher confirme un pago automáticamente. Es uno de los dos únicos ganchos hacia adelante de toda la Fase A, y cuesta cero hoy.

El total se calcula acá y no en el componente: es lógica derivada de los datos, no presentación.

- [ ] **Step 2: Verificar typecheck**

Run: `pnpm typecheck`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/features/pedidos/hooks
git commit -m "feat(pedidos): hook de pedidos pendientes con mutación"
```

---

« [06 · Datos de pedidos](06-pedidos-datos.md) · [08 · Componentes →](08-pedidos-componentes.md)
