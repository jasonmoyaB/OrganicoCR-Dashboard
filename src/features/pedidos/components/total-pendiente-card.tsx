import { formatColones } from "@/utils/format-colones";

interface Props {
  totalCentimos: number;
  cantidadPedidos: number;
}

export function TotalPendienteCard({ totalCentimos, cantidadPedidos }: Props) {
  return (
    // La única superficie oscura de la pantalla. Es la cifra por la que se
    // abre el dashboard, y en verde bosque se encuentra sin leer nada.
    <div className="relative overflow-hidden rounded-2xl bg-bosque p-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-20 size-64 rounded-full bg-hoja/25 blur-3xl"
      />

      <div className="relative">
        <p className="text-sm text-white/70">Total pendiente de cobro</p>

        {/* tabular-nums alinea los dígitos en columna: sin eso los montos bailan
            y comparar cifras a simple vista cuesta. */}
        <p className="mt-2 font-display text-5xl font-semibold tracking-tight tabular-nums text-white">
          {formatColones(totalCentimos)}
        </p>

        <p className="mt-2 text-sm text-hoja">
          {cantidadPedidos} {cantidadPedidos === 1 ? "pedido" : "pedidos"}
        </p>
      </div>
    </div>
  );
}
