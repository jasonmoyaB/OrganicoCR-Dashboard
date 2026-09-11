« [Fase A](README.md)

# 08 · Componentes de render puro

**Produce:** tres componentes sin fetch, sin estado de servidor, sin lógica de negocio. Reciben props y pintan.

**Files:**
- Create: `src/features/pedidos/components/total-pendiente-card.tsx`
- Create: `src/features/pedidos/components/pedido-row.tsx`
- Create: `src/features/pedidos/components/pedidos-deben-table.tsx`

## Los bordes llevan color explicito

Tailwind v4 resetea los bordes en preflight:

```css
border: 0 solid;
```

Sin color, o sea `currentColor`. Un `className="border"` pelado hereda el color del texto y sale casi negro, no el gris claro de v3. Todos los bordes de estos componentes declaran su color: `border border-neutral-200`.

- [x] **Step 1: Tarjeta de total**

`src/features/pedidos/components/total-pendiente-card.tsx`:

```tsx
import { formatColones } from "@/utils/format-colones";

interface Props {
  totalCentimos: number;
  cantidadPedidos: number;
}

export function TotalPendienteCard({ totalCentimos, cantidadPedidos }: Props) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-6">
      <p className="text-sm text-neutral-500">Total pendiente de cobro</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums text-neutral-900">
        {formatColones(totalCentimos)}
      </p>
      <p className="mt-1 text-sm text-neutral-500">
        {cantidadPedidos} {cantidadPedidos === 1 ? "pedido" : "pedidos"}
      </p>
    </div>
  );
}
```

`tabular-nums` alinea los dígitos en columna. Sin eso, los montos bailan y comparar cifras a simple vista cuesta.

- [x] **Step 2: Fila de pedido**

`src/features/pedidos/components/pedido-row.tsx`:

```tsx
import type { Pedido } from "../types/pedido.types";
import { diasTranscurridos } from "@/utils/dias-transcurridos";
import { formatColones } from "@/utils/format-colones";

const DIAS_ALERTA = 7;

interface Props {
  pedido: Pedido;
  onMarcarPagado: (pedidoId: string) => void;
  deshabilitado: boolean;
}

export function PedidoRow({ pedido, onMarcarPagado, deshabilitado }: Props) {
  const dias = diasTranscurridos(pedido.fechaPedido);
  const claseAntiguedad = dias >= DIAS_ALERTA ? "text-red-600 font-medium" : "text-neutral-500";

  return (
    <tr className="border-b border-neutral-200 last:border-0">
      <td className="px-4 py-3 font-mono text-sm text-neutral-900">#{pedido.numeroPedido}</td>
      <td className="px-4 py-3 text-neutral-900">{pedido.clienteNombre}</td>
      <td className="px-4 py-3 text-right tabular-nums text-neutral-900">
        {formatColones(pedido.totalCentimos)}
      </td>
      <td className={`px-4 py-3 text-right tabular-nums ${claseAntiguedad}`}>
        {dias} {dias === 1 ? "día" : "días"}
      </td>
      <td className="px-4 py-3 text-right">
        <button
          type="button"
          onClick={() => onMarcarPagado(pedido.id)}
          disabled={deshabilitado}
          className="rounded border border-neutral-300 px-3 py-1 text-sm text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50"
        >
          Marcar pagado
        </button>
      </td>
    </tr>
  );
}
```

- [x] **Step 3: Tabla**

`src/features/pedidos/components/pedidos-deben-table.tsx`:

```tsx
import type { Pedido } from "../types/pedido.types";
import { PedidoRow } from "./pedido-row";

interface Props {
  pedidos: Pedido[];
  onMarcarPagado: (pedidoId: string) => void;
  marcandoPagado: boolean;
}

export function PedidosDebenTable({ pedidos, onMarcarPagado, marcandoPagado }: Props) {
  if (pedidos.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-12 text-center text-neutral-500">
        No hay pedidos pendientes de pago.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
      <table className="w-full">
        <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-sm text-neutral-500">
          <tr>
            <th className="px-4 py-3 font-medium">Pedido</th>
            <th className="px-4 py-3 font-medium">Cliente</th>
            <th className="px-4 py-3 text-right font-medium">Monto</th>
            <th className="px-4 py-3 text-right font-medium">Antigüedad</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {pedidos.map((pedido) => (
            <PedidoRow
              key={pedido.id}
              pedido={pedido}
              onMarcarPagado={onMarcarPagado}
              deshabilitado={marcandoPagado}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [x] **Step 4: Verificar typecheck**

Run: `pnpm typecheck`
Expected: sin errores. Todavía nada los renderiza — eso viene en la tarea siguiente.

- [x] **Step 5: Commit**

```bash
git add src/features/pedidos/components
git commit -m "feat(pedidos): componentes de la tabla Deben"
```

---

« [07 · Hook](07-pedidos-hook.md) · [09 · Página "Deben" →](09-pedidos-pagina.md)
