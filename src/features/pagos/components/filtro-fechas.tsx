import { ETIQUETAS_RANGO, RANGO, RANGOS_RAPIDOS, type Rango } from "@/constants/rangos-fecha";

const CLASE_BOTON =
  "rounded-full px-3 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bosque";
const CLASE_ACTIVO = "bg-bosque text-white";
const CLASE_INACTIVO = "border border-borde text-apagado hover:bg-crema";
const CLASE_CAMPO =
  "rounded-lg border border-borde bg-white px-2.5 py-1.5 text-sm text-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bosque";

interface Props {
  rango: Rango;
  personalizado: { desde: string; hasta: string };
  maximo: string;
  onElegir: (rango: Rango) => void;
  onCambiar: (campo: "desde" | "hasta", valor: string) => void;
}

export function FiltroFechas({ rango, personalizado, maximo, onElegir, onCambiar }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
      <div className="flex flex-wrap gap-2">
        {RANGOS_RAPIDOS.map((opcion) => (
          <button
            key={opcion}
            type="button"
            aria-pressed={rango === opcion}
            onClick={() => onElegir(opcion)}
            className={`${CLASE_BOTON} ${rango === opcion ? CLASE_ACTIVO : CLASE_INACTIVO}`}
          >
            {ETIQUETAS_RANGO[opcion]}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm text-apagado" htmlFor="pagos-desde">
          Del
        </label>
        <input
          id="pagos-desde"
          type="date"
          value={personalizado.desde}
          max={personalizado.hasta || maximo}
          onChange={(evento) => onCambiar("desde", evento.target.value)}
          className={CLASE_CAMPO}
        />

        <label className="text-sm text-apagado" htmlFor="pagos-hasta">
          al
        </label>
        <input
          id="pagos-hasta"
          type="date"
          value={personalizado.hasta}
          min={personalizado.desde}
          max={maximo}
          onChange={(evento) => onCambiar("hasta", evento.target.value)}
          className={CLASE_CAMPO}
        />

        {rango === RANGO.PERSONALIZADO && (
          <button
            type="button"
            onClick={() => onElegir(RANGO.TODO)}
            className="text-sm text-apagado underline underline-offset-2 hover:text-tinta"
          >
            Limpiar
          </button>
        )}
      </div>
    </div>
  );
}
