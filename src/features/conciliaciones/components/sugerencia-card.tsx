import { formatColones } from "@/utils/format-colones";
import { formatFechaHora } from "@/utils/format-fecha-hora";
import type { Sugerencia } from "../types/conciliacion.types";
import { DesgloseScore } from "./desglose-score";

const CLASE_BOTON =
  "rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50";
const CLASE_LADO = "flex-1 space-y-1";
const CLASE_ROTULO = "text-xs font-medium tracking-wide text-apagado uppercase";

interface Props {
  sugerencia: Sugerencia;
  onResolver: (confirmar: boolean) => void;
  ocupado: boolean;
}

export function SugerenciaCard({ sugerencia, onResolver, ocupado }: Props) {
  // Que los montos no coincidan es lo primero que hay que ver: es la razón más
  // frecuente por la que una sugerencia hay que descartarla.
  const montosCalzan = sugerencia.montoCentimos === sugerencia.totalCentimos;

  return (
    <article className="space-y-4 rounded-xl border border-borde bg-white p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className={CLASE_LADO}>
          <p className={CLASE_ROTULO}>Pedido #{sugerencia.numeroPedido}</p>
          <p className="font-medium text-tinta">{sugerencia.clienteNombre}</p>
          <p className="text-lg font-semibold tabular-nums text-tinta">
            {formatColones(sugerencia.totalCentimos)}
          </p>
          <p className="text-sm text-apagado">{formatFechaHora(sugerencia.fechaPedido)}</p>
        </div>

        <div aria-hidden className="self-center text-2xl text-apagado/40">→</div>

        <div className={CLASE_LADO}>
          <p className={CLASE_ROTULO}>Pago recibido</p>
          <p className="font-medium text-tinta">{sugerencia.remitenteNombre ?? "sin nombre"}</p>
          <p
            className={`text-lg font-semibold tabular-nums ${montosCalzan ? "text-tinta" : "text-alerta"}`}
          >
            {formatColones(sugerencia.montoCentimos)}
            {!montosCalzan && <span className="ml-2 text-sm font-normal">no coincide</span>}
          </p>
          <p className="text-sm text-apagado">{formatFechaHora(sugerencia.fechaPago)}</p>
          {sugerencia.referenciaDetalle && (
            <p className="text-sm text-apagado">Motivo: {sugerencia.referenciaDetalle}</p>
          )}
        </div>
      </div>

      <DesgloseScore desglose={sugerencia.desglose} />

      <div className="flex justify-end gap-2 border-t border-borde pt-4">
        <button
          type="button"
          disabled={ocupado}
          onClick={() => onResolver(false)}
          className={`${CLASE_BOTON} border border-borde text-apagado hover:bg-crema`}
        >
          No es este
        </button>
        <button
          type="button"
          disabled={ocupado}
          onClick={() => onResolver(true)}
          className={`${CLASE_BOTON} bg-bosque text-white hover:bg-bosque/90`}
        >
          Sí, está pagado
        </button>
      </div>
    </article>
  );
}
