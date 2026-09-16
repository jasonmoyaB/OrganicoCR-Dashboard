import { useEffect, useId, useRef, type MouseEvent, type ReactNode } from "react";

// `<dialog>` nativo y no un div con overlay: el navegador ya trae la tecla
// Escape, el foco encerrado adentro, el fondo inerte y el apilado por encima de
// todo. Reimplementar eso a mano son cien líneas que se rompen en cuanto
// alguien agrega un `z-index`.
const CLASE_DIALOGO =
  "m-auto w-[min(32rem,calc(100vw-2rem))] rounded-2xl border border-borde bg-white p-0 shadow-xl backdrop:bg-tinta/40";

const CLASE_CERRAR =
  "-mr-1 rounded-lg px-2 py-1 text-xl leading-none text-apagado transition-colors hover:bg-crema hover:text-tinta focus-visible:outline-2 focus-visible:outline-bosque";

interface Props {
  abierto: boolean;
  titulo: string;
  onCerrar: () => void;
  children: ReactNode;
}

export function Modal({ abierto, titulo, onCerrar, children }: Props) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const tituloId = useId();

  useEffect(() => {
    const elemento = dialogo.current;
    if (!elemento) return;

    // Los dos guardas importan: `showModal()` sobre un diálogo ya abierto tira
    // InvalidStateError, y `close()` sobre uno cerrado dispara otro `close`.
    if (abierto && !elemento.open) elemento.showModal();
    if (!abierto && elemento.open) elemento.close();
  }, [abierto]);

  // Un clic en el fondo oscuro llega al `<dialog>` con el propio diálogo como
  // destino: el contenido vive en un hijo, así que cualquier clic de adentro
  // trae otro `target`.
  const alClicarFondo = (evento: MouseEvent<HTMLDialogElement>) => {
    if (evento.target === evento.currentTarget) onCerrar();
  };

  return (
    <dialog
      ref={dialogo}
      aria-labelledby={tituloId}
      className={CLASE_DIALOGO}
      onClose={onCerrar}
      onClick={alClicarFondo}
    >
      <div className="flex items-start justify-between gap-4 border-b border-borde px-5 py-4">
        <h2 id={tituloId} className="font-display text-lg font-semibold text-tinta">
          {titulo}
        </h2>

        <button type="button" onClick={onCerrar} aria-label="Cerrar" className={CLASE_CERRAR}>
          ×
        </button>
      </div>

      <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
    </dialog>
  );
}
