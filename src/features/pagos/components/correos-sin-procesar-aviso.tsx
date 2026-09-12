interface Props {
  cantidad: number;
}

export function CorreosSinProcesarAviso({ cantidad }: Props) {
  if (cantidad === 0) return null;

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
      <span className="font-medium tabular-nums">{cantidad}</span>{" "}
      {cantidad === 1 ? "correo capturado sin procesar" : "correos capturados sin procesar"}.
      Están guardados y se pueden re-procesar cuando el extractor los reconozca.
    </div>
  );
}
