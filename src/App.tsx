import { useState } from "react";
import { AppHeader } from "@/components/app-header";
import { NavegacionPrincipal } from "@/components/navegacion-principal";
import { SECCION, type Seccion } from "@/constants/secciones";
import { LoginForm } from "@/features/auth/components/login-form";
import { useSesion } from "@/features/auth/hooks/use-sesion";
import { PagosPage } from "@/features/pagos/components/pagos-page";
import { PedidosDebenPage } from "@/features/pedidos/components/pedidos-deben-page";

// Dos secciones no justifican react-router: no hay enlaces que compartir ni
// rutas profundas. Si la fase D suma "Revisar" y "Pagaron", se reevalúa.
const PAGINAS: Record<Seccion, () => React.ReactElement> = {
  [SECCION.DEBEN]: PedidosDebenPage,
  [SECCION.PAGOS]: PagosPage,
};

export default function App() {
  const { sesion, cargando } = useSesion();
  const [seccion, setSeccion] = useState<Seccion>(SECCION.DEBEN);

  if (cargando) {
    return <div className="p-8 text-neutral-500">Cargando…</div>;
  }

  if (!sesion) {
    return <LoginForm />;
  }

  const Pagina = PAGINAS[seccion];

  return (
    <div className="min-h-screen bg-neutral-50">
      <AppHeader email={sesion.user.email ?? ""} />
      <NavegacionPrincipal activa={seccion} onCambiar={setSeccion} />
      <Pagina />
    </div>
  );
}
