import { useNotificacionesPush } from "../hooks/use-notificaciones-push";
import { AvisoNotificaciones } from "./aviso-notificaciones";

// Mismo reparto que el banner de correos sin procesar: este contenedor tiene el
// hook y el de abajo solo dibuja, así que el aviso se puede mirar sin navegador
// ni permisos de por medio.
export function NotificacionesBanner() {
  const { estado, error, activar, descartar } = useNotificacionesPush();

  return (
    <AvisoNotificaciones
      estado={estado}
      error={error}
      onActivar={() => void activar()}
      onDescartar={descartar}
    />
  );
}
