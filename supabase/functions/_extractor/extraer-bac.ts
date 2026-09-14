import { normalizarMontoCRC } from "./normalizar-monto-crc.ts";
import { AVISO_BAC, EGRESO_BAC, INGRESO_BAC, MONEDA_EXTRANJERA } from "./plantillas-bac.ts";
import {
  esPago,
  NO_RECONOCIDO,
  noAplica,
  type ResultadoExtraccion,
} from "./resultado-extraccion.ts";

const ESPACIOS = /\s+/g;
const GUION_BAJO = /_/g;

export function extraerBAC(cuerpo: string): ResultadoExtraccion {
  if (!AVISO_BAC.test(cuerpo)) return NO_RECONOCIDO;

  // El orden importa: los avisos de egreso traen la misma frase "un monto de
  // X Colones por concepto de Y" que los de ingreso, así que si no se
  // descartan primero, cada pago que Hernán hace entraría como cobro.
  if (EGRESO_BAC.test(cuerpo)) return noAplica("Egreso: el BAC debitó la cuenta");

  const encontrado = INGRESO_BAC.exec(cuerpo);
  if (!encontrado?.groups) {
    return MONEDA_EXTRANJERA.test(cuerpo)
      ? noAplica("Ingreso en otra moneda: los pedidos se cobran en colones")
      : NO_RECONOCIDO;
  }

  try {
    return esPago({
      montoCentimos: normalizarMontoCRC(encontrado.groups.monto),
      // El BAC no dice quién mandó la plata: en sus avisos el único nombre que
      // aparece es el del titular de la cuenta, o sea el propio dueño. Se deja
      // en null en vez de poner ese nombre, que haría que el matcher cruzara
      // todos los pagos del BAC contra el cliente equivocado.
      remitenteNombre: null,
      // El concepto es lo único que identifica el pago. A veces trae el nombre
      // de quien paga ("ZARCERO AGRICOLA") y a veces los números de factura
      // ("FACT 7277 7282"); las dos cosas sirven para reconocerlo a ojo.
      referenciaDetalle: encontrado.groups.referencia.replace(GUION_BAJO, " ")
        .replace(ESPACIOS, " ").trim() || null,
    });
  } catch {
    return NO_RECONOCIDO;
  }
}
