import { formatColones } from "@/utils/format-colones";
import { formatDiaLargo } from "@/utils/format-fecha-hora";
import type { DiaDePagos } from "../hooks/use-reporte-pagos";
import { PagosTable } from "./pagos-table";

interface Props {
  dia: DiaDePagos;
}

export function DiaDePagosSeccion({ dia }: Props) {
  const cantidad = dia.pagos.length;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-lg font-medium text-tinta">
          {/* El día se arma con la fecha del primer pago y no con `dia.dia`:
              ese string ya perdió la hora, y formatDiaLargo espera un ISO. */}
          {formatDiaLargo(dia.pagos[0].fechaPago)}
        </h2>

        <p className="text-sm text-apagado">
          <span className="font-semibold tabular-nums text-tinta">
            {formatColones(dia.totalCentimos)}
          </span>{" "}
          en {cantidad} {cantidad === 1 ? "pago" : "pagos"}
        </p>
      </div>

      <PagosTable pagos={dia.pagos} />
    </section>
  );
}
