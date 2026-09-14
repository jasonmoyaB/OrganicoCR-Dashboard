interface Props {
  cantidad: number;
}

export function CorreosSinProcesarAviso({ cantidad }: Props) {
  if (cantidad === 0) return null;

  return (
    <div className="flex gap-3 rounded-2xl border border-ambar/30 bg-ambar-suave p-4 text-sm text-ambar">
      <span aria-hidden="true" className="mt-1.5 size-2 shrink-0 rounded-full bg-ambar" />

      <p>
        <span className="font-semibold tabular-nums">{cantidad}</span>{" "}
        {cantidad === 1 ? "correo capturado sin procesar" : "correos capturados sin procesar"}.
        Están guardados y se pueden re-procesar cuando el extractor los reconozca.
      </p>
    </div>
  );
}
