import { AvisoError } from "@/components/aviso-error";
import { useSugerencias } from "../hooks/use-sugerencias";
import { SugerenciaCard } from "./sugerencia-card";

const CLASE_PAGINA = "mx-auto max-w-6xl space-y-8 px-6 py-10 sm:px-8";

export function RevisarPage() {
  const { sugerencias, cargando, error, reintentar, resolver, resolviendo, errorAlResolver } =
    useSugerencias();

  if (cargando) return <div className={CLASE_PAGINA}>Cargando sugerencias…</div>;
  if (error) {
    return (
      <div className={CLASE_PAGINA}>
        <AvisoError error={error} onReintentar={reintentar} />
      </div>
    );
  }

  return (
    <div className={CLASE_PAGINA}>
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-tinta">Revisar</h1>
        <p className="max-w-2xl text-sm text-apagado">
          Pagos que probablemente cubren un pedido, pero sin certeza suficiente para darlos por
          cobrados solos. Confirmá el que corresponda y el pedido pasa a Pagaron.
        </p>
      </div>

      {errorAlResolver && <AvisoError error={errorAlResolver} />}

      {sugerencias.length === 0 ? (
        <p className="rounded-xl border border-borde bg-white px-5 py-8 text-center text-apagado">
          Nada que revisar.
        </p>
      ) : (
        <div className="space-y-4">
          {sugerencias.map((sugerencia) => (
            <SugerenciaCard
              key={sugerencia.id}
              sugerencia={sugerencia}
              ocupado={resolviendo}
              onResolver={(confirmar) =>
                resolver({ conciliacionId: sugerencia.id, confirmar })
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
