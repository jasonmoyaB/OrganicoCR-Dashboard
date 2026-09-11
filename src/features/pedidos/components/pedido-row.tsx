import { diasTranscurridos } from "@/utils/dias-transcurridos";
import { formatColones } from "@/utils/format-colones";
import type { Pedido } from "../types/pedido.types";

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
