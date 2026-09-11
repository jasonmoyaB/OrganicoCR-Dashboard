import { useLoginForm } from "../hooks/use-login-form";

const CLASE_INPUT =
  "w-full rounded border border-neutral-300 px-3 py-2 outline-none focus:border-green-700";

export function LoginForm() {
  const { email, setEmail, password, setPassword, error, enviando, manejarSubmit } =
    useLoginForm();

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50">
      <form
        onSubmit={manejarSubmit}
        className="w-full max-w-sm space-y-4 rounded-lg border border-neutral-200 bg-white p-8 shadow-sm"
      >
        <h1 className="text-xl font-semibold text-neutral-900">OrganicoCR</h1>

        <input
          type="email"
          value={email}
          onChange={(evento) => setEmail(evento.target.value)}
          placeholder="Correo"
          autoComplete="username"
          required
          className={CLASE_INPUT}
        />

        <input
          type="password"
          value={password}
          onChange={(evento) => setPassword(evento.target.value)}
          placeholder="Contraseña"
          autoComplete="current-password"
          required
          className={CLASE_INPUT}
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={enviando}
          className="w-full rounded bg-green-700 py-2 text-white transition-colors hover:bg-green-800 disabled:opacity-50"
        >
          {enviando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
