import { useMemo } from "react";
import { agruparPorDia } from "@/utils/agrupar-por-dia";
import { descargarCSV, pagosACSV } from "../services/exportar-pagos";
import type { Pago } from "../types/pago.types";

export interface DiaDePagos {
  dia: string;
  pagos: Pago[];
  totalCentimos: number;
}

function sumar(pagos: Pago[]): number {
  return pagos.reduce((suma, pago) => suma + pago.montoCentimos, 0);
}

export function useReportePagos(pagos: Pago[]) {
  const dias = useMemo<DiaDePagos[]>(
    () =>
      agruparPorDia(pagos, (pago) => pago.fechaPago).map(({ dia, items }) => ({
        dia,
        pagos: items,
        totalCentimos: sumar(items),
      })),
    [pagos],
  );

  const totalCentimos = useMemo(() => sumar(pagos), [pagos]);

  // El nombre del archivo lleva la fecha para que bajar el reporte dos veces
  // no sobrescriba el anterior en la carpeta de descargas.
  const exportar = () => {
    const hoy = new Date().toISOString().slice(0, 10);
    descargarCSV(pagosACSV(pagos), `pagos-organicocr-${hoy}.csv`);
  };

  return { dias, totalCentimos, exportar };
}
