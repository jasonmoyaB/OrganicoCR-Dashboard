import type { KeyboardEvent } from "react";
import { formatColones } from "@/utils/format-colones";
import { formatFechaHora } from "@/utils/format-fecha-hora";
import type { Pago } from "../types/pago.types";
import { MetodoBadge } from "./metodo-badge";

const CLASE_VACIO = "text-apagado/50";

const CLASE_FILA =
  "cursor-pointer border-b border-borde transition-colors last:border-0 hover:bg-crema/70 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-bosque";

// Teclas de activación: el `<tr>` no es un botón, así que el navegador no las
// trae puestas. Sin `preventDefault`, la barra espaciadora además desplaza la
// página mientras se abre el modal.
const TECLAS_ABRIR = ["Enter", " "];

interface Props {
  pago: Pago;
  onVerReporte: (pago: Pago) => void;
}

export function PagoRow({ pago, onVerReporte }: Props) {
  const abrir = () => onVerReporte(pago);

  const alTeclear = (evento: KeyboardEvent<HTMLTableRowElement>) => {
    if (!TECLAS_ABRIR.includes(evento.key)) return;

    evento.preventDefault();
    abrir();
  };

  return (
    <tr
      tabIndex={0}
      onClick={abrir}
      onKeyDown={alTeclear}
      aria-label={`Ver el reporte del pago de ${formatColones(pago.montoCentimos)}`}
      className={CLASE_FILA}
    >
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
      <td className="px-4 py-3 text-sm text-apagado">
        {/* Sin pedido no es un error: los encargos que entran por WhatsApp se
            pagan igual pero nunca pasaron por la tienda, así que no hay contra
            qué cuadrarlos. */}
        {pago.pedido ? (
          <>
            <span className="tabular-nums">#{pago.pedido.numeroPedido}</span>
            <span className="ml-2 text-apagado/70">{pago.pedido.clienteNombre}</span>
          </>
        ) : (
          <span className={CLASE_VACIO}>sin pedido</span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <MetodoBadge metodo={pago.metodoExtraccion} />
      </td>
    </tr>
  );
}
