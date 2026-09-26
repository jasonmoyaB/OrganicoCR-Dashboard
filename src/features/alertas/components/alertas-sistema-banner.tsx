import { formatFechaHora } from "@/utils/format-fecha-hora";
import { useAlertasSistema } from "../hooks/use-alertas-sistema";

// Detrás del chequeo de sesión, igual que el de correos: la tabla solo se
// lee con sesión y en el login la consulta solo podría fallar.
export function AlertasSistemaBanner() {
  const alertas = useAlertasSistema();

  if (alertas.length === 0) return null;

  return (
    <div role="alert" className="border-b border-alerta/20 bg-alerta-suave text-sm text-alerta">
      <ul className="mx-auto max-w-6xl space-y-2 px-6 py-3 sm:px-8">
        {alertas.map((alerta) => (
          <li key={alerta.origen} className="flex gap-3">
            <span aria-hidden="true" className="mt-1.5 size-2 shrink-0 rounded-full bg-alerta" />
            <p>
              {alerta.mensaje}{" "}
              <span className="whitespace-nowrap opacity-80">
                Desde el {formatFechaHora(alerta.desde)}.
              </span>
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
