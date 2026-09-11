« [Fase A](README.md)

# 06 · Tipos y servicio de pedidos

**Produce:** constantes, un type guard, tipos del dominio, capa de acceso a datos y 6 tests.

**Files:**
- Create: `src/constants/estados-pago.ts`
- Create: `src/utils/es-estado-pago.ts` + `.test.ts`
- Create: `src/features/pedidos/types/pedido.types.ts`
- Create: `src/features/pedidos/services/pedidos-service.ts` + `.test.ts`

- [x] **Step 1: Constantes**

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

- [x] **Step 2: Escribir el test del type guard**

El tipo generado por Supabase dice `estado_pago: string`. **El check constraint de la migración no llega al tipo.** Castear con `as EstadoPago` le miente al compilador: si una migración futura agrega un estado, el cast lo deja pasar y la UI lo renderiza mal sin que nada falle.

`src/utils/es-estado-pago.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { esEstadoPago } from "./es-estado-pago";

describe("esEstadoPago", () => {
  it("acepta los cuatro estados del check constraint", () => {
    expect(esEstadoPago("pendiente")).toBe(true);
    expect(esEstadoPago("revisar")).toBe(true);
    expect(esEstadoPago("pagado")).toBe(true);
    expect(esEstadoPago("anulado")).toBe(true);
  });

  it("rechaza un estado que la base todavía no tiene", () => {
    expect(esEstadoPago("reembolsado")).toBe(false);
  });

  it("rechaza cadena vacía y variantes de mayúsculas", () => {
    expect(esEstadoPago("")).toBe(false);
    expect(esEstadoPago("Pendiente")).toBe(false);
  });
});
```

Run: `pnpm test src/utils/es-estado-pago`
Expected: FAIL — `Cannot find module './es-estado-pago'`.

- [x] **Step 3: Implementar el type guard**

Va en `utils/` y no en `constants/`: es una función pura, y `constants/` no lleva funciones.

`src/utils/es-estado-pago.ts`:

```ts
import { ESTADO_PAGO, type EstadoPago } from "@/constants/estados-pago";

const ESTADOS_VALIDOS: readonly string[] = Object.values(ESTADO_PAGO);

export function esEstadoPago(valor: string): valor is EstadoPago {
  return ESTADOS_VALIDOS.includes(valor);
}
```

Expected: PASS, 3 tests.

- [x] **Step 4: Tipos del dominio**

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

- [x] **Step 5: Escribir el test del mapeo**

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

  it("lanza si la base devuelve un estado que el dominio no conoce", () => {
    const filaCorrupta: PedidoRow = { ...FILA, estado_pago: "reembolsado" };

    expect(() => mapearPedido(filaCorrupta)).toThrowError(
      "Estado de pago desconocido en el pedido 1234: reembolsado",
    );
  });
});
```

Run: `pnpm test src/features/pedidos`
Expected: FAIL — `Cannot find module './pedidos-service'`.

- [x] **Step 6: Implementar el service**

`src/features/pedidos/services/pedidos-service.ts`:

```ts
import { ESTADO_PAGO, type EstadoPago } from "@/constants/estados-pago";
import type { SupabaseClienteApp } from "@/lib/supabase";
import { esEstadoPago } from "@/utils/es-estado-pago";
import type { Pedido, PedidoRow } from "../types/pedido.types";

export function mapearPedido(fila: PedidoRow): Pedido {
  if (!esEstadoPago(fila.estado_pago)) {
    throw new Error(
      `Estado de pago desconocido en el pedido ${fila.numero_pedido}: ${fila.estado_pago}`,
    );
  }

  return {
    id: fila.id,
    wooOrderId: fila.woo_order_id,
    numeroPedido: fila.numero_pedido,
    clienteNombre: fila.cliente_nombre,
    clienteEmail: fila.cliente_email,
    clienteTelefono: fila.cliente_telefono,
    totalCentimos: fila.total_centimos,
    estadoWoo: fila.estado_woo,
    estadoPago: fila.estado_pago,
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
    // Lo más viejo primero: un pedido de hace tres semanas pesa más que uno de ayer.
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

El guard hace doble trabajo: valida en runtime y estrecha el tipo, así que el `return` no necesita ningún cast.

El cliente entra como parámetro en vez de importarse adentro. Así el service se puede testear con un doble sin tocar red, y no queda acoplado a un singleton.

Run: `pnpm test src/features/pedidos`
Expected: PASS, 3 tests.

- [x] **Step 7: Prueba de humo contra la base real**

Los tests cubren el mapeo, no la query. Vale confirmar que el filtro y el orden funcionan contra el esquema de verdad: sembrar tres pedidos con la secret key — dos `pendiente` con fechas distintas y uno `pagado` — y pedir con la sesión del dueño:

```
GET /rest/v1/pedidos?select=*&estado_pago=eq.pendiente&order=fecha_pedido.asc
```

Expected: los dos pendientes, el más viejo primero, y el pagado ausente. Borrar las filas después.

- [x] **Step 8: Commit**

```bash
git add src/constants src/features/pedidos src/utils/es-estado-pago.ts src/utils/es-estado-pago.test.ts
git commit -m "feat(pedidos): tipos y servicio de acceso a datos"
```

---

« [05 · Autenticación](05-auth.md) · [07 · Hook →](07-pedidos-hook.md)
