// Cómo avisa el BAC. Salió de leer los avisos reales del buzón: cuatro
// redacciones, dos de ingreso y dos de egreso, y todas comparten la frase "un
// monto de X". Lo único que las separa es el verbo de la cuenta.

// Lo que distingue plata que sale de plata que entra. Va primero que nada: el
// BAC usa casi las mismas palabras para las dos, y leer un egreso como ingreso
// inventaría un cobro que nadie hizo.
export const EGRESO_BAC = /debitando\s+su\s+cuenta/iu;

// "...acreditando la cuenta IBAN CR53... un monto de 79,891.00 Colones, por
// concepto de ZARCERO AGRICOLA." y "...recibió una transferencia SINPE ... por
// un monto de 2,355,451.40 Colones por concepto FACT 7277 7282..."
//
// El "de" después de "por concepto" es opcional porque el banco lo escribe de
// las dos formas. El monto termina en dígito para no tragarse el punto de la
// oración, y "Colones" es obligatorio: los avisos en dólares usan esta misma
// redacción y leerlos como colones cuadraría con el pedido equivocado.
export const INGRESO_BAC =
  /un\s+monto\s+de\s+(?<monto>[\d.,]*\d)\s*Colones,?\s*por\s+concepto\s*(?:de\s+)?(?<referencia>[^.]*?)\s*(?:,\s*la\s+cual|\.|$)/iu;

// Confirma que el correo es del BAC y habla de una transferencia. Sin este
// ancla, cualquier correo con la frase "un monto de" entraría al extractor.
export const AVISO_BAC = /transferencia\s+SINPE/iu;

// Un ingreso en otra moneda no es un correo que no se entienda: se entiende
// perfectamente y no corresponde a ningún pedido, que se cobran en colones.
// Distinguirlo del formato desconocido es lo que mantiene el aviso de
// "correos sin procesar" con algún significado.
export const MONEDA_EXTRANJERA = /un\s+monto\s+de\s+[\d.,]*\d\s*(?:d[oó]lares|USD|EUR)/iu;
