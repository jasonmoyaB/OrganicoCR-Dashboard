import { formatColones } from "@/utils/format-colones";

interface Props {
  totalCentimos: number;
  cantidadPedidos: number;
}

export function TotalPendienteCard({ totalCentimos, cantidadPedidos }: Props) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-6">
      <p className="text-sm text-neutral-500">Total pendiente de cobro</p>
      {/* tabular-nums alinea los dígitos en columna: sin eso los montos bailan
          y comparar cifras a simple vista cuesta. */}
      <p className="mt-1 text-3xl font-semibold tabular-nums text-neutral-900">
        {formatColones(totalCentimos)}
      </p>
      <p className="mt-1 text-sm text-neutral-500">
        {cantidadPedidos} {cantidadPedidos === 1 ? "pedido" : "pedidos"}
      </p>
    </div>
  );
}
