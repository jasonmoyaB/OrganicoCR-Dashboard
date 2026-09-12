import type { Pago } from "../types/pago.types";
import { PagoRow } from "./pago-row";

interface Props {
  pagos: Pago[];
}

export function PagosTable({ pagos }: Props) {
  if (pagos.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-12 text-center text-neutral-500">
        Todavía no hay pagos extraídos.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
      <table className="w-full">
        <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-sm text-neutral-500">
          <tr>
            <th className="px-4 py-3 font-medium">Fecha</th>
            <th className="px-4 py-3 font-medium">Remitente</th>
            <th className="px-4 py-3 text-right font-medium">Monto</th>
            <th className="px-4 py-3 font-medium">Detalle</th>
            <th className="px-4 py-3 text-right font-medium">Extracción</th>
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
