import { ETIQUETAS_SECCION, SECCION, type Seccion } from "@/constants/secciones";

const SECCIONES = Object.values(SECCION);

const CLASE_BASE =
  "-mb-px border-b-2 px-4 py-3 font-display text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bosque";

const CLASE_ACTIVA = "border-bosque font-medium text-bosque";
const CLASE_INACTIVA = "border-transparent text-apagado hover:border-hoja hover:text-tinta";

interface Props {
  activa: Seccion;
  onCambiar: (seccion: Seccion) => void;
}

export function NavegacionPrincipal({ activa, onCambiar }: Props) {
  return (
    <nav className="border-b border-borde bg-white">
      <div className="mx-auto flex max-w-6xl gap-1 px-6 sm:px-8">
        {SECCIONES.map((seccion) => {
          const esActiva = seccion === activa;

          return (
            <button
              key={seccion}
              type="button"
              onClick={() => onCambiar(seccion)}
              aria-current={esActiva ? "page" : undefined}
              // El borde inferior marca la activa en vez de un fondo: así la
              // pestaña se lee como continuación del contenido de abajo.
              className={`${CLASE_BASE} ${esActiva ? CLASE_ACTIVA : CLASE_INACTIVA}`}
            >
              {ETIQUETAS_SECCION[seccion]}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
