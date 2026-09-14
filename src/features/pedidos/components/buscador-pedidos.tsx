const ID_CAMPO = "buscar-pedido";

const CLASE_INPUT =
  "w-full rounded-xl border border-borde bg-white px-4 py-2.5 text-tinta outline-none transition-colors placeholder:text-apagado/60 focus:border-bosque focus:ring-4 focus:ring-bosque/10";

interface BuscadorPedidosProps {
  valor: string;
  onCambiar: (valor: string) => void;
}

export function BuscadorPedidos({ valor, onCambiar }: BuscadorPedidosProps) {
  return (
    <div className="w-full sm:w-72">
      {/* La etiqueta se oculta a la vista pero sigue en el DOM: al lado del
          título "Deben" un "Buscar" escrito sobra, pero un campo sin label
          deja al lector de pantalla sin saber qué es. El placeholder no
          sustituye a la etiqueta, desaparece al escribir. */}
      <label htmlFor={ID_CAMPO} className="sr-only">
        Buscar pedido por cliente o número
      </label>

      <input
        id={ID_CAMPO}
        type="search"
        value={valor}
        onChange={(evento) => onCambiar(evento.target.value)}
        placeholder="Buscar: Ana Rojas, 1068"
        className={CLASE_INPUT}
      />
    </div>
  );
}
