const CLASE_INPUT =
  "w-full rounded border border-neutral-300 px-3 py-2 outline-none focus:border-green-700";

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
  const id = `login-${tipo}`;

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-neutral-700">
        {etiqueta}
      </label>

      <input
        id={id}
        type={tipo}
        value={valor}
        onChange={(evento) => onCambiar(evento.target.value)}
        autoComplete={AUTOCOMPLETE_POR_TIPO[tipo]}
        required
        className={CLASE_INPUT}
      />
    </div>
  );
}
