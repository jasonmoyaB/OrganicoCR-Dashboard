import type { Pago } from "../types/pago.types";
import { PagoRow } from "./pago-row";

const CLASE_TH = "px-4 py-3 text-xs font-medium tracking-wider text-apagado uppercase";

interface Props {
  pagos: Pago[];
}

export function PagosTable({ pagos }: Props) {
  if (pagos.length === 0) {
    return (
      <div className="rounded-2xl border border-borde bg-white px-6 py-16 text-center">
        <p className="font-display text-lg text-tinta">Sin pagos todavía</p>
        <p className="mt-1 text-sm text-apagado">
          Aparecerán aquí en cuanto llegue un aviso del banco a info@organicocr.store.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-borde bg-white">
      <table className="w-full">
        <thead className="border-b border-borde bg-crema text-left">
          <tr>
            <th className={CLASE_TH}>Fecha</th>
            <th className={CLASE_TH}>Remitente</th>
            <th className={`${CLASE_TH} text-right`}>Monto</th>
            <th className={CLASE_TH}>Detalle</th>
            <th className={`${CLASE_TH} text-right`}>Extracción</th>
          </tr>
        </thead>
        <tbody>
          {pagos.map((pago) => (
            <PagoRow key={pago.id} pago={pago} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
