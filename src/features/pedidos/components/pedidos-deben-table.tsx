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
