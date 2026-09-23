import { formatColones } from "@/utils/format-colones";
import { formatDiaLargo, formatFechaHora } from "@/utils/format-fecha-hora";
import type { Pago } from "../types/pago.types";
import { DatoReporte } from "./dato-reporte";
import { MetodoBadge } from "./metodo-badge";

const CLASE_VACIO = "text-apagado/70 italic";

interface Props {
  pago: Pago;
}

function porcentaje(confianza: number | null): string | null {
  return confianza === null ? null : `${Math.round(confianza * 100)}%`;
}

export function ReporteDelPago({ pago }: Props) {
  const confianza = porcentaje(pago.confianzaExtraccion);

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-borde bg-crema px-4 py-3">
        <p className="text-xs font-medium tracking-wider text-apagado uppercase">Monto recibido</p>
        <p className="font-display text-3xl font-semibold tabular-nums text-tinta">
          {formatColones(pago.montoCentimos)}
        </p>
        <p className="mt-1 text-sm text-apagado">{formatDiaLargo(pago.fechaPago)}</p>
      </div>

      <dl>
        <DatoReporte etiqueta="Entró">
          <span className="tabular-nums">{formatFechaHora(pago.fechaPago)}</span>
        </DatoReporte>

        {/* El BAC no dice quién mandó la plata: el único nombre del aviso es el
            del titular de la cuenta, o sea el dueño. Por eso "sin nombre" acá
            es lo normal y no una falla del extractor. */}
        <DatoReporte etiqueta="Quién pagó">
          {pago.remitenteNombre ?? <span className={CLASE_VACIO}>el banco no lo dice</span>}
        </DatoReporte>

        {/* Lo que más ayuda a saber de qué es el pago: el nombre viene truncado
            a 20 caracteres, el concepto no. */}
        <DatoReporte etiqueta="Concepto">
          {pago.referenciaDetalle ?? <span className={CLASE_VACIO}>sin detalle</span>}
        </DatoReporte>

        <DatoReporte etiqueta="Pedido">
          {pago.pedido ? (
            <>
              <span className="font-medium tabular-nums">#{pago.pedido.numeroPedido}</span>
              <span className="ml-2 text-apagado">{pago.pedido.clienteNombre}</span>
            </>
          ) : (
            <span className={CLASE_VACIO}>
              todavía no cuadra con ningún pedido de la tienda
            </span>
          )}
        </DatoReporte>

        <DatoReporte etiqueta="Cómo se leyó">
          <MetodoBadge metodo={pago.metodoExtraccion} />
          {confianza && <span className="ml-2 text-apagado">confianza {confianza}</span>}
        </DatoReporte>
      </dl>
    </div>
  );
}
