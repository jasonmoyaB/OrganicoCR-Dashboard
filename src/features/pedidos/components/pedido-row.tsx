import { diasTranscurridos } from "@/utils/dias-transcurridos";
import { formatColones } from "@/utils/format-colones";
import type { Pedido } from "../types/pedido.types";

const DIAS_ALERTA = 7;

// A partir de una semana la antigüedad deja de ser un dato y pasa a ser un
// aviso, así que cambia de forma además de color: en rojo sobre texto plano
// quien no distingue bien los colores no ve nada, la píldora sí se ve.
const CLASE_ANTIGUEDAD = "tabular-nums text-apagado";
const CLASE_ANTIGUEDAD_ALERTA =
  "inline-flex rounded-full bg-alerta-suave px-2.5 py-1 text-xs font-medium tabular-nums text-alerta";

const CLASE_BOTON =
  "rounded-lg border border-borde px-3 py-1.5 text-sm font-medium text-bosque transition-colors hover:border-bosque hover:bg-bosque hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bosque disabled:opacity-50";

interface Props {
  pedido: Pedido;
  onMarcarPagado: (pedidoId: string) => void;
  deshabilitado: boolean;
}

export function PedidoRow({ pedido, onMarcarPagado, deshabilitado }: Props) {
  const dias = diasTranscurridos(pedido.fechaPedido);
  const esVieja = dias >= DIAS_ALERTA;

  return (
    <tr className="border-b border-borde transition-colors last:border-0 hover:bg-crema/70">
      <td className="px-4 py-3 font-mono text-sm text-apagado">#{pedido.numeroPedido}</td>
      <td className="px-4 py-3 text-tinta">{pedido.clienteNombre}</td>
      <td className="px-4 py-3 text-right font-medium tabular-nums text-tinta">
        {formatColones(pedido.totalCentimos)}
      </td>
      <td className="px-4 py-3 text-right">
        <span className={esVieja ? CLASE_ANTIGUEDAD_ALERTA : CLASE_ANTIGUEDAD}>
          {dias} {dias === 1 ? "día" : "días"}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <button
          type="button"
          onClick={() => onMarcarPagado(pedido.id)}
          disabled={deshabilitado}
          className={CLASE_BOTON}
        >
          Marcar pagado
        </button>
      </td>
    </tr>
  );
}
