import type { Pedido } from "../types/pedido.types";
import { PedidoRow } from "./pedido-row";

const CLASE_TH = "px-4 py-3 text-xs font-medium tracking-wider text-apagado uppercase";

interface Props {
  pedidos: Pedido[];
  onMarcarPagado: (pedidoId: string) => void;
  marcandoPagado: boolean;
}

export function PedidosDebenTable({ pedidos, onMarcarPagado, marcandoPagado }: Props) {
  if (pedidos.length === 0) {
    return (
      <div className="rounded-2xl border border-borde bg-white px-6 py-16 text-center">
        <p className="font-display text-lg text-tinta">Nadie debe nada</p>
        <p className="mt-1 text-sm text-apagado">No hay pedidos pendientes de pago.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-borde bg-white">
      <table className="w-full">
        <thead className="border-b border-borde bg-crema text-left">
          <tr>
            <th className={CLASE_TH}>Pedido</th>
            <th className={CLASE_TH}>Cliente</th>
            <th className={`${CLASE_TH} text-right`}>Monto</th>
            <th className={`${CLASE_TH} text-right`}>Antigüedad</th>
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
