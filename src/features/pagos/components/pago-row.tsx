import { formatColones } from "@/utils/format-colones";
import { formatFechaHora } from "@/utils/format-fecha-hora";
import type { Pago } from "../types/pago.types";
import { MetodoBadge } from "./metodo-badge";

interface Props {
  pago: Pago;
}

export function PagoRow({ pago }: Props) {
  return (
    <tr className="border-b border-neutral-200 last:border-0">
      <td className="px-4 py-3 whitespace-nowrap tabular-nums text-sm text-neutral-500">
        {formatFechaHora(pago.fechaPago)}
      </td>
      <td className="px-4 py-3 text-neutral-900">
        {pago.remitenteNombre ?? <span className="text-neutral-400">sin nombre</span>}
      </td>
      <td className="px-4 py-3 text-right tabular-nums text-neutral-900">
        {formatColones(pago.montoCentimos)}
      </td>
      <td className="px-4 py-3 text-sm text-neutral-500">
        {pago.referenciaDetalle ?? <span className="text-neutral-400">—</span>}
      </td>
      <td className="px-4 py-3 text-right">
        <MetodoBadge metodo={pago.metodoExtraccion} />
      </td>
    </tr>
  );
}
