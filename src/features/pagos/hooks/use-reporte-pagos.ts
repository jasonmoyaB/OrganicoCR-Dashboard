import { useMemo } from "react";
import { agruparPorDia } from "@/utils/agrupar-por-dia";
import { diaCR } from "@/utils/fecha-cr";
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

  // Exporta lo que está en pantalla, filtro incluido: bajar "Hoy" y que salga
  // el año entero sorprende, y el caso de uso es justamente el reporte del día.
  // El rango va en el nombre para que dos descargas no se pisen en la carpeta.
  const exportar = () => {
    const primero = pagos.at(-1)?.fechaPago ?? new Date().toISOString();
    const ultimo = pagos[0]?.fechaPago ?? primero;
    const tramo =
      diaCR(primero) === diaCR(ultimo) ? diaCR(ultimo) : `${diaCR(primero)}_a_${diaCR(ultimo)}`;

    descargarCSV(pagosACSV(pagos), `pagos-organicocr-${tramo}.csv`);
  };

  return { dias, totalCentimos, exportar };
}
