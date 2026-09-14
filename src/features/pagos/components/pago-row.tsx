import { formatColones } from "@/utils/format-colones";
import { formatFechaHora } from "@/utils/format-fecha-hora";
import type { Pago } from "../types/pago.types";
import { MetodoBadge } from "./metodo-badge";

const CLASE_VACIO = "text-apagado/50";

interface Props {
  pago: Pago;
}

export function PagoRow({ pago }: Props) {
  return (
    <tr className="border-b border-borde transition-colors last:border-0 hover:bg-crema/70">
      <td className="px-4 py-3 text-sm whitespace-nowrap tabular-nums text-apagado">
        {formatFechaHora(pago.fechaPago)}
      </td>
      <td className="px-4 py-3 text-tinta">
        {pago.remitenteNombre ?? <span className={CLASE_VACIO}>sin nombre</span>}
      </td>
      <td className="px-4 py-3 text-right font-medium tabular-nums text-tinta">
        {formatColones(pago.montoCentimos)}
      </td>
      <td className="px-4 py-3 text-sm text-apagado">
        {pago.referenciaDetalle ?? <span className={CLASE_VACIO}>—</span>}
      </td>
      <td className="px-4 py-3 text-right">
        <MetodoBadge metodo={pago.metodoExtraccion} />
      </td>
    </tr>
  );
}
