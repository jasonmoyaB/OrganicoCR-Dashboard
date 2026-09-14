// Las formas en que Davibank avisa un ingreso. Salieron de leer avisos reales
// del buzón del negocio, no de una descripción: son tres redacciones distintas,
// y hasta el 2026-09-14 el extractor conocía solo la primera. Las otras dos se
// perdían en silencio — casi la mitad de los ingresos de la muestra.
//
// Dos decisiones que se repiten en todos los patrones:
//
// 1. La moneda va escrita y es obligatoria ("Colones" o "CRC"). Davibank manda
//    avisos en dólares con la misma redacción ("un monto de 500.00 USD"), y un
//    monto en otra moneda leído como colones cuadraría con el pedido
//    equivocado. Exigir la moneda es lo que los descarta.
// 2. El monto termina en dígito (`[\d.,]*\d`), nunca en separador. Con `+` la
//    clase se tragaba el punto final de la oración —"CRC 1,000,000.00."— y el
//    normalizador rechazaba el monto entero, así que el aviso se perdía.

export interface PlantillaDavibank {
  nombre: string;
  patron: RegExp;
}

const MONTO = String.raw`[\d.,]*\d`;

// El motivo que escribe quien paga viaja al final del aviso de SINPE Móvil,
// después del teléfono de origen y el número de referencia ("Verduras
// -87138944", "Cafe___________"). El comentario viejo decía que Davibank no
// mandaba referencia; los correos reales muestran que sí, y ese texto es lo que
// más ayuda al matcher cuando el nombre viene truncado.
const SINPE_MOVIL_CON_MOTIVO = new RegExp(
  String.raw`recib\w*\s+(?<monto>[₡\s]*${MONTO})\s*colones\s+de\s+(?<remitente>.+?)\s+al\s+sinpe\s+m[oó]vil\s+\d+\s+por\s+sinpe\s+m[oó]vil,\s*\d+\.\s*\d+\s+(?<referencia>[^\n]*?)\s*(?=\n|aviso\s+legal|$)`,
  "iu",
);

// Respaldo para un aviso de SINPE Móvil que no traiga la cola del motivo: sin
// esto, un cambio de formato en esa cola haría perder el pago entero.
const SINPE_MOVIL = new RegExp(
  String.raw`recib\w*\s+(?<monto>[₡\s]*${MONTO})\s*colones\s+de\s+(?<remitente>.+?)\s+al\s+sinpe`,
  "iu",
);

// "...un pago inmediato de X desde BAC San José S.A a través de SINPE, por un
// monto de 51,175.44 CRC." La moneda va detrás del número acá.
const PAGO_INMEDIATO = new RegExp(
  String.raw`pago\s+inmediato\s+de\s+(?<remitente>.+?)\s+desde\s+.+?\s+por\s+un\s+monto\s+de\s+(?<monto>${MONTO})\s*CRC\b(?:[\s\S]*?n[uú]mero\s+de\s+referencia:\s*(?<referencia>\S+))?`,
  "iu",
);

// "...una transferencia SINPE de X por un monto de CRC 377,742.05." Acá la
// moneda va delante. Mismo aviso, orden distinto: por eso son dos patrones y no
// uno con la moneda opcional, que aceptaría un monto sin moneda ninguna.
const TRANSFERENCIA_SINPE = new RegExp(
  String.raw`transferencia\s+SINPE\s+de\s+(?<remitente>.+?)\s+por\s+un\s+monto\s+de\s+CRC\s*(?<monto>${MONTO})(?:[\s\S]*?n[uú]mero\s+de\s+referencia:\s*(?<referencia>\S+))?`,
  "iu",
);

// El orden importa: la variante con motivo antes que la mínima, porque las dos
// reconocen el mismo aviso y la primera que acierta gana.
export const PLANTILLAS: readonly PlantillaDavibank[] = [
  { nombre: "sinpe-movil-con-motivo", patron: SINPE_MOVIL_CON_MOTIVO },
  { nombre: "sinpe-movil", patron: SINPE_MOVIL },
  { nombre: "pago-inmediato", patron: PAGO_INMEDIATO },
  { nombre: "transferencia-sinpe", patron: TRANSFERENCIA_SINPE },
];

// Davibank avisa los egresos con "Envío exitoso de ..." y los débitos con
// "Recepción de débito". No son correos que no se entiendan: son plata que
// sale, y no hay nada que hacer con ellos salvo no confundirlos con un cobro.
// "Devolución de crédito directo Entrante ... fue devuelto" es plata que iba a
// entrar y volvió: trae un monto en CRC con la misma forma que un cobro, así
// que sin esta línea el día que el patrón de ingreso la alcance registraría un
// cobro que nunca ocurrió.
export const EGRESO_DAVIBANK =
  /env[ií]o\s+exitoso|recepci[oó]n\s+de\s+d[eé]bito|devoluci[oó]n\s+de\s+cr[eé]dito/iu;

// Un ingreso en dólares se entiende perfectamente y no corresponde a ningún
// pedido. Es distinto de un formato que nadie supo leer.
export const MONEDA_EXTRANJERA_DAVIBANK =
  /monto\s+de\s+[\d.,]*\d\s*(?:USD|d[oó]lares)|[\d.,]*\d\s*USD\b/iu;
