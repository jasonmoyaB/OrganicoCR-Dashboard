import { aCSV } from "@/utils/a-csv";
import { formatFechaHora } from "@/utils/format-fecha-hora";
import type { Pago } from "../types/pago.types";

// El reporte que Hernán abre en Excel. El monto va en colones con punto
// decimal —Excel con locale español lo lee como número— y no en céntimos: la
// hoja es para sumar y filtrar, no para volver a entrar al sistema.
const ENCABEZADOS = [
  "Fecha",
  "Quien pagó",
  "Monto",
  "Motivo",
  "Pedido",
  "Cliente del pedido",
] as const;

const CENTIMOS_POR_COLON = 100;

function fila(pago: Pago): (string | number | null)[] {
  return [
    formatFechaHora(pago.fechaPago),
    pago.remitenteNombre,
    (pago.montoCentimos / CENTIMOS_POR_COLON).toFixed(2),
    pago.referenciaDetalle,
    pago.pedido?.numeroPedido ?? null,
    pago.pedido?.clienteNombre ?? null,
  ];
}

export function pagosACSV(pagos: Pago[]): string {
  return aCSV([...ENCABEZADOS], pagos.map(fila));
}

// La descarga se arma en el navegador y no pasa por el servidor: los datos ya
// están en memoria y mandarlos de vuelta solo para que vuelvan sería un viaje
// de ida y vuelta con datos personales sin ninguna ganancia.
export function descargarCSV(contenido: string, nombre: string): void {
  const url = URL.createObjectURL(new Blob([contenido], { type: "text/csv;charset=utf-8" }));
  const enlace = document.createElement("a");

  enlace.href = url;
  enlace.download = nombre;
  enlace.click();

  URL.revokeObjectURL(url);
}
