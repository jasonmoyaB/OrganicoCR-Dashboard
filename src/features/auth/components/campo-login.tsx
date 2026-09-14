import { useState } from "react";
import { BotonVerPassword } from "./boton-ver-password";

// Relleno crema y borde transparente en reposo; al enfocar, el campo se vuelve
// blanco y el borde verde bosque. El halo es del mismo verde al 10%: marca el
// foco sin el azul del navegador, que aquí sería el único color ajeno.
const CLASE_INPUT =
  "w-full rounded-xl border border-transparent bg-crema px-4 py-2.5 text-tinta outline-none transition-colors placeholder:text-apagado/60 focus:border-bosque focus:bg-white focus:ring-4 focus:ring-bosque/10";

// Un login tiene exactamente dos campos y cada tipo tiene un único
// autocompletado correcto. Derivarlo del tipo evita pasarlo suelto en cada uso
// y que una pantalla quede con el valor de la otra.
const AUTOCOMPLETE_POR_TIPO = {
  email: "username",
  password: "current-password",
} as const;

type TipoCampoLogin = keyof typeof AUTOCOMPLETE_POR_TIPO;

interface CampoLoginProps {
  etiqueta: string;
  tipo: TipoCampoLogin;
  valor: string;
  onCambiar: (valor: string) => void;
}

export function CampoLogin({ etiqueta, tipo, valor, onCambiar }: CampoLoginProps) {
  const [visible, setVisible] = useState(false);
  const id = `login-${tipo}`;
  const esPassword = tipo === "password";

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-tinta">
        {etiqueta}
      </label>

      <div className="relative">
        <input
          id={id}
          // El autocompletado sigue siendo el del tipo declarado, no el del
          // tipo renderizado: al destapar la contraseña el input pasa a "text"
          // y sin esto el gestor de claves deja de reconocer el campo.
          type={esPassword && visible ? "text" : tipo}
          value={valor}
          onChange={(evento) => onCambiar(evento.target.value)}
          autoComplete={AUTOCOMPLETE_POR_TIPO[tipo]}
          required
          className={`${CLASE_INPUT} ${esPassword ? "pr-12" : ""}`}
        />

        {esPassword && (
          <BotonVerPassword visible={visible} onAlternar={() => setVisible(!visible)} />
        )}
      </div>
    </div>
  );
}
