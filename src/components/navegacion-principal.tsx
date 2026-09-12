import { ETIQUETAS_SECCION, SECCION, type Seccion } from "@/constants/secciones";

const SECCIONES = Object.values(SECCION);

interface Props {
  activa: Seccion;
  onCambiar: (seccion: Seccion) => void;
}

export function NavegacionPrincipal({ activa, onCambiar }: Props) {
  return (
    <nav className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-5xl gap-1 px-8">
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
              className={`-mb-px border-b-2 px-4 py-3 text-sm transition-colors ${
                esActiva
                  ? "border-neutral-900 font-medium text-neutral-900"
                  : "border-transparent text-neutral-500 hover:text-neutral-900"
              }`}
            >
              {ETIQUETAS_SECCION[seccion]}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
