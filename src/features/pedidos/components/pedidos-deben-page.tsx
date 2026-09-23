import { useMemo, useState } from "react";
import { Buscador } from "@/components/buscador";
import { coincideBusqueda } from "@/utils/coincide-busqueda";
import { usePedidosPendientes } from "../hooks/use-pedidos-pendientes";
import { PedidosDebenTable } from "./pedidos-deben-table";
import { TotalPendienteCard } from "./total-pendiente-card";

const CLASE_PAGINA = "mx-auto max-w-6xl space-y-8 px-6 py-10 sm:px-8";

export function PedidosDebenPage() {
  const { pedidos, totalCentimos, cargando, error, marcarPagado, marcandoPagado } =
    usePedidosPendientes();
  const [busqueda, setBusqueda] = useState("");

  const filtrados = useMemo(
    () =>
      pedidos.filter((pedido) =>
        coincideBusqueda(busqueda, [pedido.clienteNombre, pedido.numeroPedido]),
      ),
    [pedidos, busqueda],
  );

  if (cargando) return <div className={CLASE_PAGINA}>Cargando pedidos…</div>;
  if (error) return <div className={`${CLASE_PAGINA} text-alerta`}>{error.message}</div>;

  return (
    <div className={CLASE_PAGINA}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-tinta">Deben</h1>

        <Buscador
          valor={busqueda}
          onCambiar={setBusqueda}
          etiqueta="Buscar pedido por cliente o número"
          placeholder="Buscar: Ana Rojas, 1068"
        />
      </div>

      {/* El total es de TODOS los pendientes, no de los filtrados: buscar sirve
          para encontrar un pedido, y que el total cambie al escribir confunde. */}
      <TotalPendienteCard totalCentimos={totalCentimos} cantidadPedidos={pedidos.length} />

      <PedidosDebenTable
        pedidos={filtrados}
        onMarcarPagado={marcarPagado}
        marcandoPagado={marcandoPagado}
      />
    </div>
  );
}
