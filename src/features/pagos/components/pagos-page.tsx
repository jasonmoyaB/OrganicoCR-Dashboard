import { useCorreosSinProcesar } from "../hooks/use-correos-sin-procesar";
import { usePagos } from "../hooks/use-pagos";
import { CorreosSinProcesarAviso } from "./correos-sin-procesar-aviso";
import { PagosTable } from "./pagos-table";

export function PagosPage() {
  const { pagos, cargando, error } = usePagos();
  const { cantidad } = useCorreosSinProcesar();

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-8">
      <h1 className="text-2xl font-semibold text-neutral-900">Pagos</h1>

      <p className="text-sm text-neutral-500">
        Pagos leídos del correo del banco, todavía sin cruzar contra los pedidos.
      </p>

      {/* El aviso va fuera del early return de error: si la lista de pagos
          falla, el contador de correos sigue siendo la información útil. */}
      <CorreosSinProcesarAviso cantidad={cantidad} />

      {cargando && <div className="text-neutral-500">Cargando pagos…</div>}
      {error && <div className="text-red-600">{error.message}</div>}
      {!cargando && !error && <PagosTable pagos={pagos} />}
    </div>
  );
}
