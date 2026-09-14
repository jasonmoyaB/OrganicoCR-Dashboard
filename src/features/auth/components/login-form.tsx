import { useLoginForm } from "../hooks/use-login-form";
import { CampoLogin } from "./campo-login";
import { MarcaLogin } from "./marca-login";

// Sombra verde, no gris: sobre el verde oscuro del fondo una sombra neutra se
// ve sucia, y esta hace que la tarjeta parezca apoyada sobre el color.
const CLASE_TARJETA =
  "rounded-3xl border border-white/10 bg-white p-8 shadow-[0_28px_70px_-24px_rgba(0,63,48,0.55)] sm:p-10";

const CLASE_BOTON =
  "w-full rounded-xl bg-bosque py-3 font-display font-medium text-white transition-colors hover:bg-bosque-claro focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bosque disabled:opacity-60";

export function LoginForm() {
  const { email, setEmail, password, setPassword, error, enviando, manejarSubmit } =
    useLoginForm();

  return (
    <main className="malla-bosque flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md">
        <form onSubmit={manejarSubmit} className={CLASE_TARJETA}>
          <MarcaLogin />

          <div className="mt-8 space-y-4">
            <CampoLogin etiqueta="Correo" tipo="email" valor={email} onCambiar={setEmail} />

            <CampoLogin
              etiqueta="Contraseña"
              tipo="password"
              valor={password}
              onCambiar={setPassword}
            />
          </div>

          {error && (
            <p
              role="alert"
              className="mt-4 rounded-xl bg-alerta-suave px-4 py-3 text-sm text-alerta"
            >
              {error}
            </p>
          )}

          <button type="submit" disabled={enviando} className={`mt-6 ${CLASE_BOTON}`}>
            {enviando ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs tracking-wide text-white/45">organicocr.store</p>
      </div>
    </main>
  );
}
