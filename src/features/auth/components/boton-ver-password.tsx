const CLASE_BOTON =
  "absolute top-1/2 right-2 -translate-y-1/2 rounded-lg p-2 text-apagado transition-colors hover:bg-crema hover:text-bosque focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bosque";

// Ojo tachado = la contraseña está a la vista y esto la esconde. El icono
// muestra la acción del botón, no el estado actual: al revés, la mitad de la
// gente lee lo contrario. La etiqueta accesible dice lo mismo en palabras.
const TRAZOS_OCULTAR = [
  "M10.73 5.08A10.74 10.74 0 0 1 21.94 11.65a1 1 0 0 1 0 .7 10.75 10.75 0 0 1-1.44 2.49",
  "M14.08 14.16a3 3 0 0 1-4.24-4.24",
  "M17.48 17.5A10.75 10.75 0 0 1 2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 4.45-5.14",
  "m2 2 20 20",
];

const TRAZO_MOSTRAR =
  "M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0";

interface Props {
  visible: boolean;
  onAlternar: () => void;
}

export function BotonVerPassword({ visible, onAlternar }: Props) {
  const etiqueta = visible ? "Ocultar contraseña" : "Mostrar contraseña";

  return (
    // type="button" es obligatorio: dentro de un <form> el default es submit,
    // y el ojo mandaría el login a medio escribir.
    <button type="button" onClick={onAlternar} aria-label={etiqueta} title={etiqueta} className={CLASE_BOTON}>
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
        {visible ? (
          TRAZOS_OCULTAR.map((trazo) => <path key={trazo} d={trazo} />)
        ) : (
          <>
            <path d={TRAZO_MOSTRAR} />
            <circle cx="12" cy="12" r="3" />
          </>
        )}
      </svg>
    </button>
  );
}
