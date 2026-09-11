import { AppHeader } from "@/components/app-header";
import { LoginForm } from "@/features/auth/components/login-form";
import { useSesion } from "@/features/auth/hooks/use-sesion";
import { PedidosDebenPage } from "@/features/pedidos/components/pedidos-deben-page";

export default function App() {
  const { sesion, cargando } = useSesion();

  if (cargando) {
    return <div className="p-8 text-neutral-500">Cargando…</div>;
  }

  if (!sesion) {
    return <LoginForm />;
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <AppHeader email={sesion.user.email ?? ""} />
      <PedidosDebenPage />
    </div>
  );
}
