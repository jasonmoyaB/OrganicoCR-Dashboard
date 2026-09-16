import type { EstadoPush } from "../hooks/use-notificaciones-push";

const CLASE_ACTIVAR =
  "shrink-0 rounded-lg bg-bosque px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-bosque-claro focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bosque disabled:opacity-50";

const CLASE_DESCARTAR =
  "shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium text-apagado transition-colors hover:text-bosque focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bosque";

interface Props {
  estado: EstadoPush;
  error: string | null;
  onActivar: () => void;
  onDescartar: () => void;
}

function Franja({ children }: { children: React.ReactNode }) {
  return (
    <div role="status" className="border-b border-borde bg-white text-sm text-tinta">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-6 py-3 sm:px-8">
        {children}
      </div>
    </div>
  );
}

// Solo dos estados dibujan algo. "activas" y "no-disponible" no tienen nada que
// decir, y "bloqueadas" sí: un dueño que apretó "Bloquear" sin querer no se
// entera nunca de por qué no le suena el teléfono, y la página no puede volver
// a preguntar —ese permiso solo se devuelve desde los ajustes del navegador—.
export function AvisoNotificaciones({ estado, error, onActivar, onDescartar }: Props) {
  if (estado === "bloqueadas") {
    return (
      <Franja>
        <p className="min-w-0 flex-1 text-apagado">
          Las notificaciones están bloqueadas en este navegador. Se vuelven a permitir desde los
          ajustes del sitio, al lado de la dirección.
        </p>
        <button type="button" onClick={onDescartar} className={CLASE_DESCARTAR}>
          Entendido
        </button>
      </Franja>
    );
  }

  if (estado !== "puede-activar" && estado !== "activando") return null;

  return (
    <Franja>
      <p className="min-w-0 flex-1">
        Avisame en este dispositivo cuando entre un pago.
        {error && <span className="ml-1 text-alerta">{error}</span>}
      </p>

      <button
        type="button"
        onClick={onActivar}
        disabled={estado === "activando"}
        className={CLASE_ACTIVAR}
      >
        {estado === "activando" ? "Activando…" : "Activar notificaciones"}
      </button>

      <button type="button" onClick={onDescartar} className={CLASE_DESCARTAR}>
        Ahora no
      </button>
    </Franja>
  );
}
