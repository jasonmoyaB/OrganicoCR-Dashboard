import { formatColones } from "@/utils/format-colones";
import { usePedidosPagados } from "../hooks/use-pedidos-pagados";
import { PedidosPagaronTable } from "./pedidos-pagaron-table";

const CLASE_PAGINA = "mx-auto max-w-6xl space-y-8 px-6 py-10 sm:px-8";

export function PedidosPagaronPage() {
  const { pedidos, totalCentimos, cargando, error } = usePedidosPagados();

  if (cargando) return <div className={CLASE_PAGINA}>Cargando pedidos…</div>;
  if (error) return <div className={`${CLASE_PAGINA} text-alerta`}>{error.message}</div>;

  return (
    <div className={CLASE_PAGINA}>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-tinta">Pagaron</h1>
        <p className="text-sm text-apagado">
          <span className="font-semibold tabular-nums text-tinta">
            {formatColones(totalCentimos)}
          </span>{" "}
          en {pedidos.length} {pedidos.length === 1 ? "pedido" : "pedidos"}
        </p>
      </div>

      <PedidosPagaronTable pedidos={pedidos} />
    </div>
  );
}
