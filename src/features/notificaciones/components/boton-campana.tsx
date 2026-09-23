const CLASE_BOTON =
  "relative rounded-lg p-2 text-bosque transition-colors hover:bg-crema focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bosque";

// Rojo de alerta y no verde: el verde es el color de todo el dashboard y un
// contador del mismo color desaparece dentro de la cabecera.
const CLASE_CONTADOR =
  "absolute -top-0.5 -right-0.5 min-w-5 rounded-full bg-alerta px-1 text-center text-[11px] leading-5 font-semibold text-white";

const TRAZO_BADAJO = "M10.268 21a2 2 0 0 0 3.464 0";
const TRAZO_CAMPANA =
  "M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326";

// Más de nueve ya no se lee como un número sino como "un montón", y tres
// dígitos rompen el círculo del contador.
const TOPE_VISIBLE = 9;

interface Props {
  cantidad: number;
  abierto: boolean;
  onAlternar: () => void;
}

export function BotonCampana({ cantidad, abierto, onAlternar }: Props) {
  const etiqueta =
    cantidad > 0 ? `Notificaciones, ${cantidad} sin ver` : "Notificaciones, ninguna sin ver";

  return (
    <button
      type="button"
      onClick={onAlternar}
      aria-label={etiqueta}
      title={etiqueta}
      aria-expanded={abierto}
      aria-haspopup="true"
      className={CLASE_BOTON}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-5"
      >
        <path d={TRAZO_BADAJO} />
        <path d={TRAZO_CAMPANA} />
      </svg>

      {/* El contador es aria-hidden porque la etiqueta del botón ya lo dice en
          palabras: un lector de pantalla leería el número dos veces. */}
      {cantidad > 0 && (
        <span aria-hidden="true" className={CLASE_CONTADOR}>
          {cantidad > TOPE_VISIBLE ? `${TOPE_VISIBLE}+` : cantidad}
        </span>
      )}
    </button>
  );
}
