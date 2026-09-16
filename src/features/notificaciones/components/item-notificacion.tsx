import { formatColones } from "@/utils/format-colones";
import { haceCuanto } from "@/utils/hace-cuanto";
import type { NotificacionPago } from "../types/notificacion.types";

const CLASE_ITEM =
  "block w-full px-4 py-3 text-left transition-colors hover:bg-crema focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-bosque";

interface Props {
  notificacion: NotificacionPago;
  onAbrir: () => void;
}

// Quién pagó, y si el banco no lo dijo, para qué. El BAC nunca manda el nombre
// de quien envía —el único del aviso es el del propio dueño—, así que ahí el
// concepto es lo único que identifica el pago.
function quien(notificacion: NotificacionPago): string {
  return notificacion.remitenteNombre ?? notificacion.referenciaDetalle ?? "Sin nombre";
}

export function ItemNotificacion({ notificacion, onAbrir }: Props) {
  return (
    <li>
      <button type="button" onClick={onAbrir} className={CLASE_ITEM}>
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-medium tabular-nums text-tinta">
            {formatColones(notificacion.montoCentimos)}
          </span>
          <span className="shrink-0 text-xs text-apagado">
            {haceCuanto(notificacion.creadoEn)}
          </span>
        </div>

        <p className="mt-0.5 truncate text-sm text-apagado">{quien(notificacion)}</p>
      </button>
    </li>
  );
}
