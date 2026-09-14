import type { PedidoPagado } from "../types/pedido.types";
import { PedidoPagadoRow } from "./pedido-pagado-row";

const CLASE_TH = "px-4 py-3 text-left text-xs font-medium tracking-wide text-apagado uppercase";

interface Props {
  pedidos: PedidoPagado[];
}

export function PedidosPagaronTable({ pedidos }: Props) {
  if (pedidos.length === 0) {
    return (
      <p className="rounded-xl border border-borde bg-white px-5 py-8 text-center text-apagado">
        Todavía no hay pedidos cobrados.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-borde bg-white">
      <table className="w-full min-w-[40rem]">
        <thead className="border-b border-borde bg-crema/50">
          <tr>
            <th className={CLASE_TH}>Pedido</th>
            <th className={CLASE_TH}>Cliente</th>
            <th className={`${CLASE_TH} text-right`}>Monto</th>
            <th className={CLASE_TH}>Pagado por</th>
          </tr>
        </thead>
        <tbody>
          {pedidos.map((pedido) => (
            <PedidoPagadoRow key={pedido.id} pedido={pedido} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
