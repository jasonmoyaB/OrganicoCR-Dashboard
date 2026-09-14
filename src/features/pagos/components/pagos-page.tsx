import { useCorreosSinProcesar } from "../hooks/use-correos-sin-procesar";
import { usePagos } from "../hooks/use-pagos";
import { CorreosSinProcesarAviso } from "./correos-sin-procesar-aviso";
import { PagosTable } from "./pagos-table";

export function PagosPage() {
  const { pagos, cargando, error } = usePagos();
  const { cantidad } = useCorreosSinProcesar();

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6 py-10 sm:px-8">
      <div className="max-w-2xl">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-tinta">Pagos</h1>

        <p className="mt-2 text-apagado">
          Pagos leídos del correo del banco, todavía sin cruzar contra los pedidos.
        </p>
      </div>

      {/* El aviso va fuera del early return de error: si la lista de pagos
          falla, el contador de correos sigue siendo la información útil. */}
      <CorreosSinProcesarAviso cantidad={cantidad} />

      {cargando && <div className="text-apagado">Cargando pagos…</div>}
      {error && <div className="text-alerta">{error.message}</div>}
      {!cargando && !error && <PagosTable pagos={pagos} />}
    </div>
  );
}
