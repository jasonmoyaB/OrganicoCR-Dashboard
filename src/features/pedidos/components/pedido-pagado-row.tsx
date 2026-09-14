import { formatColones } from "@/utils/format-colones";
import { formatFechaHora } from "@/utils/format-fecha-hora";
import type { PedidoPagado } from "../types/pedido.types";

const CLASE_VACIO = "text-apagado/50";

interface Props {
  pedido: PedidoPagado;
}

export function PedidoPagadoRow({ pedido }: Props) {
  return (
    <tr className="border-b border-borde transition-colors last:border-0 hover:bg-crema/70">
      <td className="px-4 py-3 text-sm whitespace-nowrap tabular-nums text-apagado">
        #{pedido.numeroPedido}
      </td>
      <td className="px-4 py-3 text-tinta">{pedido.clienteNombre}</td>
      <td className="px-4 py-3 text-right font-medium tabular-nums text-tinta">
        {formatColones(pedido.totalCentimos)}
      </td>
      <td className="px-4 py-3 text-sm text-apagado">
        {/* Sin pago detrás significa que lo marcó el dueño a mano o que vino
            de WooCommerce ya cobrado. No es un error, pero se distingue. */}
        {pedido.pago ? (
          <>
            {pedido.pago.remitenteNombre ?? "sin nombre"}
            <span className="ml-2 tabular-nums text-apagado/70">
              {formatFechaHora(pedido.pago.fechaPago)}
            </span>
          </>
        ) : (
          <span className={CLASE_VACIO}>marcado a mano</span>
        )}
      </td>
    </tr>
  );
}
