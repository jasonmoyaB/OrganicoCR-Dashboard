import { explicarError } from "@/utils/explicar-error";
import type { NotificacionPago } from "../types/notificacion.types";
import { ItemNotificacion } from "./item-notificacion";

// En móvil `fixed` y no `absolute`: `absolute right-0` alinea el panel con el
// borde derecho de la campana, que no es el borde de la pantalla —después
// vienen el espacio y el botón de "Salir"—, así que 20rem creciendo hacia la
// izquierda se salen de un teléfono de 360 px. Fijo a los dos lados de la
// ventana, el ancho lo decide la pantalla y no hay por dónde desbordar.
//
// Sin `top`: un elemento posicionado sin desplazamiento vertical se queda en su
// posición estática, o sea justo debajo de la campana. Así el panel cuelga del
// botón sin que nadie tenga que escribir cuánto mide la cabecera, que es un
// número que se rompe solo la próxima vez que alguien le toque el padding.
const CLASE_PANEL =
  "fixed inset-x-4 z-20 mt-2 overflow-hidden rounded-xl border border-borde bg-white shadow-lg sm:absolute sm:inset-x-auto sm:right-0 sm:w-80";

// 50vh y no una altura fija: un teléfono acostado tiene 360 px de alto, y una
// lista de 20rem deja el botón de limpiar fuera de la pantalla sin nada que
// insinúe que está ahí abajo. `overscroll-contain` corta el encadenado: al
// llegar al final de la lista, el dedo deja de arrastrar la página de atrás.
const CLASE_LISTA =
  "max-h-[50vh] divide-y divide-borde overflow-y-auto overscroll-contain sm:max-h-80";

const CLASE_LIMPIAR =
  "w-full px-4 py-2.5 text-sm font-medium text-bosque transition-colors hover:bg-crema focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-bosque disabled:opacity-50 disabled:hover:bg-white";

interface Props {
  notificaciones: NotificacionPago[];
  error: Error | null;
  onAbrirPagos: () => void;
  onLimpiar: () => void;
}

export function PanelNotificaciones({ notificaciones, error, onAbrirPagos, onLimpiar }: Props) {
  const vacio = notificaciones.length === 0;

  return (
    <div className={CLASE_PANEL} role="region" aria-label="Notificaciones de pagos">
      <div className="flex items-baseline justify-between gap-3 border-b border-borde px-4 py-3">
        <h2 className="font-display text-sm font-semibold text-tinta">Notificaciones</h2>
        {!vacio && <span className="text-xs text-apagado">{notificaciones.length} sin ver</span>}
      </div>

      {error && <p className="px-4 py-6 text-sm text-alerta">{explicarError(error).titulo}</p>}

      {!error && vacio && (
        <p className="px-4 py-8 text-center text-sm text-apagado">
          Nada nuevo. Los pagos que entren aparecen acá.
        </p>
      )}

      {!error && !vacio && (
        <ul className={CLASE_LISTA}>
          {notificaciones.map((notificacion) => (
            <ItemNotificacion
              key={notificacion.id}
              notificacion={notificacion}
              onAbrir={onAbrirPagos}
            />
          ))}
        </ul>
      )}

      {/* Limpiar no borra nada de la base: el historial completo sigue en la
          sección "Pagos". Lo único que se olvida es que faltaba mirarlos. */}
      <div className="border-t border-borde">
        <button type="button" onClick={onLimpiar} disabled={vacio} className={CLASE_LIMPIAR}>
          Limpiar notificaciones
        </button>
      </div>
    </div>
  );
}
