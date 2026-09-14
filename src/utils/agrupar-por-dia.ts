import { diaCR } from "./fecha-cr";

export interface GrupoDelDia<T> {
  dia: string;
  items: T[];
}

// Genérica y no atada a `Pago` a propósito: `utils` no puede importar de
// `features` sin invertir la dirección de las dependencias.
//
// Conserva el orden en que vienen los items, así que ordenar es
// responsabilidad de quien llama: la consulta ya pide los pagos por fecha
// descendente y reordenar acá sería hacer dos veces el mismo trabajo.
export function agruparPorDia<T>(items: T[], fechaDe: (item: T) => string): GrupoDelDia<T>[] {
  const porDia = new Map<string, T[]>();

  for (const item of items) {
    const dia = diaCR(fechaDe(item));
    const grupo = porDia.get(dia);

    if (grupo) grupo.push(item);
    else porDia.set(dia, [item]);
  }

  return [...porDia].map(([dia, items]) => ({ dia, items }));
}
