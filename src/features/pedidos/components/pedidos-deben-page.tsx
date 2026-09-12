import { useMemo, useState } from "react";
import { usePedidosPendientes } from "../hooks/use-pedidos-pendientes";
import { BuscadorPedidos } from "./buscador-pedidos";
import { PedidosDebenTable } from "./pedidos-deben-table";
import { TotalPendienteCard } from "./total-pendiente-card";

export function PedidosDebenPage() {
  const { pedidos, totalCentimos, cargando, error, marcarPagado, marcandoPagado } =
    usePedidosPendientes();
  const [busqueda, setBusqueda] = useState("");

  const filtrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return pedidos;

    return pedidos.filter(
      (pedido) =>
        pedido.clienteNombre.toLowerCase().includes(termino) ||
        pedido.numeroPedido.includes(termino),
    );
  }, [pedidos, busqueda]);

  if (cargando) return <div className="p-8 text-neutral-500">Cargando pedidos…</div>;
  if (error) return <div className="p-8 text-red-600">{error.message}</div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-8">
      <h1 className="text-2xl font-semibold text-neutral-900">Deben</h1>

      {/* El total es de TODOS los pendientes, no de los filtrados: buscar sirve
          para encontrar un pedido, y que el total cambie al escribir confunde. */}
      <TotalPendienteCard totalCentimos={totalCentimos} cantidadPedidos={pedidos.length} />

      <BuscadorPedidos valor={busqueda} onCambiar={setBusqueda} />

      <PedidosDebenTable
        pedidos={filtrados}
        onMarcarPagado={marcarPagado}
        marcandoPagado={marcandoPagado}
      />
    </div>
  );
}
