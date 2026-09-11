import { LoginForm } from "@/features/auth/components/login-form";
import { useSesion } from "@/features/auth/hooks/use-sesion";

export default function App() {
  const { sesion, cargando } = useSesion();

  if (cargando) {
    return <div className="p-8 text-neutral-500">Cargando…</div>;
  }

  if (!sesion) {
    return <LoginForm />;
  }

  return <div className="p-8 text-neutral-900">Sesión iniciada.</div>;
}
