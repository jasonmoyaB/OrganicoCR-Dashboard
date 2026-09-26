import { explicarError } from "@/utils/explicar-error";

const CLASE_BOTON =
  "mt-3 rounded-lg border border-alerta/30 px-3 py-1.5 font-medium transition-colors hover:bg-alerta hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-alerta";

interface Props {
  error: unknown;
  onReintentar?: () => void;
}

// Todos los errores del dashboard se ven igual: qué pasó en palabras del
// dueño, y el mensaje original plegado, para copiárselo a quien lo arregle.
export function AvisoError({ error, onReintentar }: Props) {
  const { titulo, detalle, tecnico } = explicarError(error);

  return (
    <div
      role="alert"
      className="rounded-xl border border-alerta/20 bg-alerta-suave px-5 py-4 text-sm text-alerta"
    >
      <p className="font-semibold">{titulo}</p>
      <p className="mt-1">{detalle}</p>

      {tecnico !== detalle && (
        <details className="mt-2 text-xs">
          <summary className="cursor-pointer">Detalle técnico</summary>
          <p className="mt-1 font-mono break-words">{tecnico}</p>
        </details>
      )}

      {onReintentar && (
        <button type="button" onClick={onReintentar} className={CLASE_BOTON}>
          Reintentar
        </button>
      )}
    </div>
  );
}
