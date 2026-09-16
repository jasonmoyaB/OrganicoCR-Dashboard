import { useNotificacionesPagos } from "../hooks/use-notificaciones-pagos";
import { usePanelCampana } from "../hooks/use-panel-campana";
import { BotonCampana } from "./boton-campana";
import { PanelNotificaciones } from "./panel-notificaciones";

interface Props {
  onIrAPagos: () => void;
}

// Mismo reparto que el resto de la feature: este contenedor tiene los hooks y
// los de abajo solo dibujan, así que la campana y el panel se pueden mirar sin
// sesión ni base de por medio.
export function CampanaNotificaciones({ onIrAPagos }: Props) {
  const { notificaciones, limpiar, error } = useNotificacionesPagos();
  const { abierto, alternar, cerrar, contenedor } = usePanelCampana();

  const abrirPagos = () => {
    cerrar();
    onIrAPagos();
  };

  return (
    <div ref={contenedor} className="relative">
      <BotonCampana cantidad={notificaciones.length} abierto={abierto} onAlternar={alternar} />

      {abierto && (
        <PanelNotificaciones
          notificaciones={notificaciones}
          error={error}
          onAbrirPagos={abrirPagos}
          onLimpiar={limpiar}
        />
      )}
    </div>
  );
}
