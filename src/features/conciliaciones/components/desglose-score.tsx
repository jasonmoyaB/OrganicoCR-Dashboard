import type { DesgloseScore } from "../types/conciliacion.types";

// Qué tan bien calzó cada criterio, en palabras. El número crudo no le dice
// nada a nadie; "el monto coincide exacto" sí.
const CRITERIOS: { clave: keyof DesgloseScore; etiqueta: string }[] = [
  { clave: "monto", etiqueta: "Monto" },
  { clave: "nombre", etiqueta: "Nombre" },
  { clave: "tiempo", etiqueta: "Fecha" },
  { clave: "referencia", etiqueta: "Referencia" },
];

const FUERTE = 0.8;
const DEBIL = 0.4;

function claseDe(valor: number): string {
  if (valor >= FUERTE) return "bg-hoja/15 text-bosque";
  if (valor >= DEBIL) return "bg-crema text-apagado";
  return "bg-crema text-apagado/60";
}

interface Props {
  desglose: DesgloseScore;
}

export function DesgloseScore({ desglose }: Props) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {CRITERIOS.map(({ clave, etiqueta }) => (
        <span
          key={clave}
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${claseDe(desglose[clave])}`}
        >
          {etiqueta} {Math.round(desglose[clave] * 100)}%
        </span>
      ))}
    </div>
  );
}
