import type { ReactNode } from "react";

interface Props {
  etiqueta: string;
  children: ReactNode;
}

export function DatoReporte({ etiqueta, children }: Props) {
  return (
    <div className="border-b border-borde py-2.5 last:border-0 sm:grid sm:grid-cols-[8.5rem_1fr] sm:gap-4">
      <dt className="text-sm text-apagado">{etiqueta}</dt>
      <dd className="mt-0.5 text-sm text-tinta sm:mt-0">{children}</dd>
    </div>
  );
}
