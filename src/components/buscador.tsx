import { useId } from "react";

const CLASE_INPUT =
  "w-full rounded-xl border border-borde bg-white px-4 py-2.5 text-tinta outline-none transition-colors placeholder:text-apagado/60 focus:border-bosque focus:ring-4 focus:ring-bosque/10";

interface BuscadorProps {
  valor: string;
  onCambiar: (valor: string) => void;
  etiqueta: string;
  placeholder: string;
}

export function Buscador({ valor, onCambiar, etiqueta, placeholder }: BuscadorProps) {
  const id = useId();

  return (
    <div className="w-full sm:w-72">
      {/* La etiqueta se oculta a la vista pero sigue en el DOM: al lado del
          título de la sección un "Buscar" escrito sobra, pero un campo sin
          label deja al lector de pantalla sin saber qué es. El placeholder no
          sustituye a la etiqueta, desaparece al escribir. */}
      <label htmlFor={id} className="sr-only">
        {etiqueta}
      </label>

      <input
        id={id}
        type="search"
        value={valor}
        onChange={(evento) => onCambiar(evento.target.value)}
        placeholder={placeholder}
        className={CLASE_INPUT}
      />
    </div>
  );
}
