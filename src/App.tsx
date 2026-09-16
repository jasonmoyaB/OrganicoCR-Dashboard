import { useState } from "react";
import { AppHeader } from "@/components/app-header";
import { NavegacionPrincipal } from "@/components/navegacion-principal";
import { SECCION, type Seccion } from "@/constants/secciones";
import { LoginForm } from "@/features/auth/components/login-form";
import { useSesion } from "@/features/auth/hooks/use-sesion";
import { RevisarPage } from "@/features/conciliaciones/components/revisar-page";
import { NotificacionesBanner } from "@/features/notificaciones/components/notificaciones-banner";
import { CorreosSinProcesarBanner } from "@/features/pagos/components/correos-sin-procesar-banner";
import { PagosPage } from "@/features/pagos/components/pagos-page";
import { PedidosDebenPage } from "@/features/pedidos/components/pedidos-deben-page";
import { PedidosPagaronPage } from "@/features/pedidos/components/pedidos-pagaron-page";
import { seccionInicial } from "@/utils/seccion-inicial";

// Cuatro secciones siguen sin justificar react-router: es un dashboard de un
// solo usuario, sin enlaces que compartir ni rutas profundas. Lo que lo
// justificaría es querer volver a una sección tras recargar, no la cantidad.
const PAGINAS: Record<Seccion, () => React.ReactElement> = {
  [SECCION.DEBEN]: PedidosDebenPage,
  [SECCION.REVISAR]: RevisarPage,
  [SECCION.PAGARON]: PedidosPagaronPage,
  [SECCION.PAGOS]: PagosPage,
};

export default function App() {
  const { sesion, cargando } = useSesion();
  // El estado arranca donde diga la URL. No es ruteo —la sección no vuelve a
  // tocar la barra de direcciones—: es la puerta de entrada que necesitan el
  // atajo del icono instalado y el clic en una notificación de pago.
  const [seccion, setSeccion] = useState<Seccion>(() => seccionInicial(window.location.search));

  // Verde oscuro, igual que el login: mientras se resuelve la sesión no se
  // sabe cuál de las dos pantallas viene, y arrancar en crema para saltar a
  // verde oscuro es un parpadeo cada vez que se recarga sin sesión.
  if (cargando) {
    return <div className="malla-bosque min-h-screen" />;
  }

  if (!sesion) {
    return <LoginForm />;
  }

  const Pagina = PAGINAS[seccion];

  return (
    <div className="min-h-screen bg-crema">
      <AppHeader email={sesion.user.email ?? ""} />
      <NavegacionPrincipal activa={seccion} onCambiar={setSeccion} />

      {/* Fuera de las páginas: un correo del banco que no se pudo leer puede
          ser plata sin registrar, y quien mira "Deben" no tiene por qué pasar
          por "Pagos" para enterarse. */}
      <CorreosSinProcesarBanner />

      {/* Debajo del de correos a propósito: el de correos es plata que puede
          estar perdiéndose ahora; este es una oferta. */}
      <NotificacionesBanner />

      <Pagina />
    </div>
  );
}
