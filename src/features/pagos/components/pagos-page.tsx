import { formatColones } from "@/utils/format-colones";
import { useCorreosSinProcesar } from "../hooks/use-correos-sin-procesar";
import { usePagos } from "../hooks/use-pagos";
import { useReportePagos } from "../hooks/use-reporte-pagos";
import { CorreosSinProcesarAviso } from "./correos-sin-procesar-aviso";
import { DiaDePagosSeccion } from "./dia-de-pagos";

export function PagosPage() {
  const { pagos, cargando, error } = usePagos();
  const { cantidad } = useCorreosSinProcesar();
  const { dias, totalCentimos, exportar } = useReportePagos(pagos);

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6 py-10 sm:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-tinta">Pagos</h1>

          <p className="mt-2 text-apagado">
            Todo lo que entró por SINPE y transferencia, leído del correo del banco y agrupado por
            día. Incluye los pagos que no corresponden a ningún pedido de la tienda.
          </p>
        </div>

        <button
          type="button"
          onClick={exportar}
          disabled={pagos.length === 0}
          className="rounded-lg border border-borde px-4 py-2 text-sm font-medium text-tinta transition-colors hover:bg-crema disabled:opacity-50"
        >
          Exportar a Excel
        </button>
      </div>

      {pagos.length > 0 && (
        <p className="text-sm text-apagado">
          Total recibido:{" "}
          <span className="font-semibold tabular-nums text-tinta">
            {formatColones(totalCentimos)}
          </span>{" "}
          en {pagos.length} {pagos.length === 1 ? "pago" : "pagos"}
        </p>
      )}

      {/* El aviso va fuera del early return de error: si la lista de pagos
          falla, el contador de correos sigue siendo la información útil. */}
      <CorreosSinProcesarAviso cantidad={cantidad} />

      {cargando && <div className="text-apagado">Cargando pagos…</div>}
      {error && <div className="text-alerta">{error.message}</div>}

      {!cargando && !error && dias.length === 0 && (
        <div className="rounded-2xl border border-borde bg-white px-6 py-16 text-center">
          <p className="font-display text-lg text-tinta">Sin pagos todavía</p>
          <p className="mt-1 text-sm text-apagado">
            Aparecerán aquí en cuanto llegue un aviso del banco a info@organicocr.store.
          </p>
        </div>
      )}

      <div className="space-y-8">
        {dias.map((dia) => (
          <DiaDePagosSeccion key={dia.dia} dia={dia} />
        ))}
      </div>
    </div>
  );
}
