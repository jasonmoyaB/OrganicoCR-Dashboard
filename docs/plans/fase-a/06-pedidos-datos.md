« [Fase A](README.md)

# 06 · Tipos y servicio de pedidos

**Produce:** constantes, tipos del dominio, capa de acceso a datos y 2 tests.

**Files:**
- Create: `src/constants/estados-pago.ts`
- Create: `src/features/pedidos/types/pedido.types.ts`
- Create: `src/features/pedidos/services/pedidos-service.ts` + `.test.ts`

- [ ] **Step 1: Constantes**

`src/constants/estados-pago.ts`:

```ts
export const ESTADO_PAGO = {
  PENDIENTE: "pendiente",
  REVISAR: "revisar",
  PAGADO: "pagado",
  ANULADO: "anulado",
} as const;

export type EstadoPago = (typeof ESTADO_PAGO)[keyof typeof ESTADO_PAGO];
```

Qué significa cada estado: [modelo de datos](../../specs/05-datos.md).

- [ ] **Step 2: Tipos del dominio**

`src/features/pedidos/types/pedido.types.ts`:

```ts
import type { EstadoPago } from "@/constants/estados-pago";
import type { Database } from "@/types/database.types";

export type PedidoRow = Database["public"]["Tables"]["pedidos"]["Row"];

export interface Pedido {
  id: string;
  wooOrderId: number;
  numeroPedido: string;
  clienteNombre: string;
  clienteEmail: string | null;
  clienteTelefono: string | null;
  totalCentimos: number;
  estadoWoo: string;
  estadoPago: EstadoPago;
  fechaPedido: string;
}
```

El dominio usa camelCase; la base usa snake_case. El mapeo ocurre una sola vez, en el service. **Ningún componente debería ver nunca un `cliente_nombre`.**

- [ ] **Step 3: Escribir el test del mapeo**

`src/features/pedidos/services/pedidos-service.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { mapearPedido } from "./pedidos-service";
import type { PedidoRow } from "../types/pedido.types";

const FILA: PedidoRow = {
  id: "11111111-1111-1111-1111-111111111111",
  woo_order_id: 1234,
  numero_pedido: "1234",
  cliente_nombre: "Ana Rojas",
  cliente_email: "ana@example.com",
  cliente_telefono: null,
  total_centimos: 1_500_000,
  moneda: "CRC",
  estado_woo: "on-hold",
  estado_pago: "pendiente",
  fecha_pedido: "2026-09-01T10:00:00Z",
  raw: {},
  created_at: "2026-09-01T10:00:00Z",
  updated_at: "2026-09-01T10:00:00Z",
};

describe("mapearPedido", () => {
  it("convierte snake_case de la base a camelCase del dominio", () => {
    const pedido = mapearPedido(FILA);

    expect(pedido.wooOrderId).toBe(1234);
    expect(pedido.clienteNombre).toBe("Ana Rojas");
    expect(pedido.totalCentimos).toBe(1_500_000);
    expect(pedido.estadoPago).toBe("pendiente");
  });

  it("preserva los nulos en vez de convertirlos a string vacío", () => {
    expect(mapearPedido(FILA).clienteTelefono).toBeNull();
  });
});
```

- [ ] **Step 4: Correr y verificar que falla**

Run: `pnpm test src/features/pedidos`
Expected: FAIL — `mapearPedido` no existe.

- [ ] **Step 5: Implementar el service**

`src/features/pedidos/services/pedidos-service.ts`:

```ts
import { ESTADO_PAGO, type EstadoPago } from "@/constants/estados-pago";
import type { SupabaseClienteApp } from "@/lib/supabase";
import type { Pedido, PedidoRow } from "../types/pedido.types";

export function mapearPedido(fila: PedidoRow): Pedido {
  return {
    id: fila.id,
    wooOrderId: fila.woo_order_id,
    numeroPedido: fila.numero_pedido,
    clienteNombre: fila.cliente_nombre,
    clienteEmail: fila.cliente_email,
    clienteTelefono: fila.cliente_telefono,
    totalCentimos: fila.total_centimos,
    estadoWoo: fila.estado_woo,
    estadoPago: fila.estado_pago as EstadoPago,
    fechaPedido: fila.fecha_pedido,
  };
}

export async function fetchPedidosPorEstado(
  cliente: SupabaseClienteApp,
  estado: EstadoPago,
): Promise<Pedido[]> {
  const { data, error } = await cliente
    .from("pedidos")
    .select("*")
    .eq("estado_pago", estado)
    .order("fecha_pedido", { ascending: true });

  if (error) throw new Error(`No se pudieron cargar los pedidos: ${error.message}`);

  return data.map(mapearPedido);
}

export async function marcarPedidoPagado(
  cliente: SupabaseClienteApp,
  pedidoId: string,
): Promise<void> {
  const { error } = await cliente
    .from("pedidos")
    .update({ estado_pago: ESTADO_PAGO.PAGADO })
    .eq("id", pedidoId);

  if (error) throw new Error(`No se pudo marcar como pagado: ${error.message}`);
}
```

El cliente entra como parámetro en vez de importarse adentro. Así el service se puede testear con un doble sin tocar red, y no queda acoplado a un singleton.

Orden ascendente por fecha: lo más viejo primero. Un pedido de hace tres semanas importa más que uno de ayer.

- [ ] **Step 6: Correr y verificar que pasa**

Run: `pnpm test src/features/pedidos`
Expected: PASS, 2 tests.

- [ ] **Step 7: Commit**

```bash
git add src/constants src/features/pedidos
git commit -m "feat(pedidos): tipos y servicio de acceso a datos"
```

---

« [05 · Autenticación](05-auth.md) · [07 · Hook →](07-pedidos-hook.md)
