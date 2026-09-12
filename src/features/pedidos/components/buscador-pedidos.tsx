const ID_CAMPO = "buscar-pedido";

interface BuscadorPedidosProps {
  valor: string;
  onCambiar: (valor: string) => void;
}

export function BuscadorPedidos({ valor, onCambiar }: BuscadorPedidosProps) {
  return (
    <div className="space-y-1">
      <label htmlFor={ID_CAMPO} className="block text-sm font-medium text-neutral-700">
        Buscar
      </label>

      <input
        id={ID_CAMPO}
        value={valor}
        onChange={(evento) => onCambiar(evento.target.value)}
        placeholder="Ana Rojas, 1068"
        className="w-full rounded-lg border border-neutral-300 bg-white px-4 py-2 outline-none focus:border-green-700"
      />
    </div>
  );
}
