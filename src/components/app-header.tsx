import { LogoOrganico } from "@/components/logo-organico";
import { useLogout } from "@/features/auth/hooks/use-logout";
import { CampanaNotificaciones } from "@/features/notificaciones/components/campana-notificaciones";

// Sin borde inferior a propósito: lo pone NavegacionPrincipal, que va pegada
// debajo. Con borde en las dos, la cabecera se parte en dos franjas blancas.
const CLASE_SALIR =
  "rounded-lg border border-borde px-3 py-1.5 text-sm font-medium text-bosque transition-colors hover:border-bosque hover:bg-bosque hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bosque disabled:opacity-50";

interface Props {
  email: string;
  onIrAPagos: () => void;
}

export function AppHeader({ email, onIrAPagos }: Props) {
  const { salir, saliendo } = useLogout();

  return (
    <header className="bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 pt-5 pb-4 sm:px-8">
        <LogoOrganico className="h-9" />

        <div className="flex items-center gap-4">
          {/* El correo se esconde en móvil: es un dashboard de un solo usuario,
              ya sabe quién es, y en 360 px le roba el sitio al botón. */}
          <span className="hidden text-sm text-apagado sm:inline">{email}</span>

          {/* La campana queda antes de "Salir" a propósito: el botón que cierra
              la sesión es el último de la fila en todas las pantallas, y moverlo
              haría que un clic de memoria caiga en otra cosa. */}
          <CampanaNotificaciones onIrAPagos={onIrAPagos} />

          <button type="button" onClick={salir} disabled={saliendo} className={CLASE_SALIR}>
            Salir
          </button>
        </div>
      </div>
    </header>
  );
}
