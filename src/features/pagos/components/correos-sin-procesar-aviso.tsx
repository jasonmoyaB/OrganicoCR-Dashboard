import { formatFechaHora } from "@/utils/format-fecha-hora";

interface Props {
  cantidad: number;
  masViejo: string | null;
}

// Rojo y no ámbar: esto ya no es "todavía no hay extractor", es un correo del
// banco que nadie supo leer. Mientras esté encendido, puede haber plata que
// entró y no aparece en ninguna parte del dashboard.
export function CorreosSinProcesarAviso({ cantidad, masViejo }: Props) {
  if (cantidad === 0) return null;

  return (
    <div
      role="status"
      className="border-b border-alerta/20 bg-alerta-suave text-sm text-alerta"
    >
      <div className="mx-auto flex max-w-6xl gap-3 px-6 py-3 sm:px-8">
        <span aria-hidden="true" className="mt-1.5 size-2 shrink-0 rounded-full bg-alerta" />

        <p>
          <span className="font-semibold tabular-nums">{cantidad}</span>{" "}
          {cantidad === 1 ? "correo del banco sin leer" : "correos del banco sin leer"}
          {masViejo && <> desde el {formatFechaHora(masViejo)}</>}. Están guardados enteros; hay
          que avisarle a Jason para que el extractor los reconozca.
        </p>
      </div>
    </div>
  );
}
