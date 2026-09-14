import { useState } from "react";
import { AppHeader } from "@/components/app-header";
import { NavegacionPrincipal } from "@/components/navegacion-principal";
import { SECCION, type Seccion } from "@/constants/secciones";
import { LoginForm } from "@/features/auth/components/login-form";
import { useSesion } from "@/features/auth/hooks/use-sesion";
import { RevisarPage } from "@/features/conciliaciones/components/revisar-page";
import { PagosPage } from "@/features/pagos/components/pagos-page";
import { PedidosDebenPage } from "@/features/pedidos/components/pedidos-deben-page";
import { PedidosPagaronPage } from "@/features/pedidos/components/pedidos-pagaron-page";

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
  const [seccion, setSeccion] = useState<Seccion>(SECCION.DEBEN);

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
      <Pagina />
    </div>
  );
}
