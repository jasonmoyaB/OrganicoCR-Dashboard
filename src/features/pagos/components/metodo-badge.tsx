import { METODO_EXTRACCION, type MetodoExtraccion } from "@/constants/metodos-extraccion";

// El regex es el camino normal y no merece destacarse. El LLM sí: cuesta plata
// por llamada y, sobre todo, significa que el regex no reconoció la plantilla.
// Varias filas en ámbar seguidas es la señal de que el banco cambió el formato.
const ESTILOS: Record<MetodoExtraccion, string> = {
  [METODO_EXTRACCION.REGEX]: "border-neutral-300 bg-neutral-50 text-neutral-600",
  [METODO_EXTRACCION.LLM]: "border-amber-300 bg-amber-50 text-amber-700",
};

const TITULOS: Record<MetodoExtraccion, string> = {
  [METODO_EXTRACCION.REGEX]: "Reconocido por la plantilla conocida del banco",
  [METODO_EXTRACCION.LLM]: "El regex no reconoció el correo y lo extrajo el modelo",
};

interface Props {
  metodo: MetodoExtraccion;
}

export function MetodoBadge({ metodo }: Props) {
  return (
    <span
      title={TITULOS[metodo]}
      className={`rounded border px-2 py-0.5 text-xs ${ESTILOS[metodo]}`}
    >
      {metodo}
    </span>
  );
}
