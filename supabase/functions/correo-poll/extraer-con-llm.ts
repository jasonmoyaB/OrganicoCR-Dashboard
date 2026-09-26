// Respaldo para cuando ningún extractor de regex reconoce el aviso.
//
// El regex sigue mandando: acá solo se llega cuando `extraerPago` devuelve
// `desconocido`, que sobre los 313 correos del buzón real pasa cero veces.
// Existe para el día que un banco cambie la redacción sin avisar — hoy ese
// aviso queda en `procesado_ok = false` y el dueño se entera tarde, contando
// correos sin leer en el dashboard.
//
// Invariante 6: el LLM extrae datos del correo, el LLM **no** concilia. Qué
// pago corresponde a qué pedido lo sigue decidiendo la función SQL, con esto
// como una entrada más.
//
// No se le piden céntimos: se le pide el monto tal como está escrito en el
// aviso y lo convierte `normalizarMontoCRC`, el mismo que usa el regex.
// Pedirle la multiplicación al modelo agregaría una clase de error —₡3 777,42
// en vez de ₡377 742,05— que ningún test de este repo atraparía.

// `import type` y no un import normal: el SDK se carga abajo, dinámicamente y
// solo si hay clave. Traerlo acá arriba obligaría a resolver el paquete apenas
// se importa el módulo, y `procesar-correo.test.ts` —que corre en vitest, no en
// Deno— dejaría de arrancar por un respaldo que en los tests ni se usa.
import type Anthropic from "npm:@anthropic-ai/sdk@0.127.0";
import { NO_RECONOCIDO, type ResultadoExtraccion } from "../_extractor/resultado-extraccion.ts";
import { explicarFallaLlm } from "./falla-llm.ts";
import { leerRespuestaLlm, MONEDA, type RespuestaLlm } from "./leer-respuesta-llm.ts";

// ponytail: Opus 5 con esfuerzo bajo. Bajar a "claude-haiku-4-5" es cambiar
// esta línea —más rápido y más barato—, pero es una decisión del dueño.
const MODELO = "claude-opus-5";

// Cuántos correos desconocidos se mandan al modelo por corrida. El cron tiene
// timeout y el cursor solo avanza si la corrida entera termina: sin este tope,
// 50 correos ilegibles de golpe se pasarían de largo y reintentarían lo mismo
// cada 5 minutos sin avanzar nunca — el bug que ya mordió con los 13 000
// mensajes del buzón.
const LLAMADAS_POR_CORRIDA = 8;

// Un aviso de banco son unos pocos kB. Lo que se pase no se recorta: se
// devuelve `desconocido` y queda para mirar a mano. Mandar medio correo al
// modelo es pedirle que adivine la otra mitad.
const LARGO_MAXIMO = 32 * 1024;

const ESQUEMA = {
  type: "object",
  properties: {
    clase: { type: "string", enum: ["pago", "no-aplica", "desconocido"] },
    motivo: { type: "string" },
    monto_texto: { type: ["string", "null"] },
    moneda: { type: ["string", "null"] },
    remitente_nombre: { type: ["string", "null"] },
    referencia_detalle: { type: ["string", "null"] },
    // Sin minimum/maximum: structured outputs los rechaza en un number
    // ("For 'number' type, properties maximum, minimum are not supported").
    // El rango lo impone `acotada`, porque `pagos.confianza_extraccion` tiene
    // un check between 0 and 1 y un 1.5 haría fallar el insert entero.
    confianza: { type: "number" },
  },
  required: [
    "clase",
    "motivo",
    "monto_texto",
    "moneda",
    "remitente_nombre",
    "referencia_detalle",
    "confianza",
  ],
  additionalProperties: false,
};

const INSTRUCCIONES = `Leés avisos automáticos de bancos de Costa Rica (Davibank, BAC) que llegan al
correo de una verdulería. El objetivo es uno solo: reconocer la plata que ENTRÓ
a la cuenta del negocio, en colones.

Devolvés "pago" únicamente si el aviso dice que la cuenta RECIBIÓ dinero:
acreditación, recepción de transferencia, SINPE Móvil recibido, depósito.

Devolvés "no-aplica", con el motivo en una frase, para todo lo demás que igual
se entiende: egresos ("envío exitoso", "recepción de débito", "debitando su
cuenta"), montos en cualquier moneda que no sea ${MONEDA}, devoluciones de
crédito directo (esa plata nunca entró), avisos de inicio de sesión, facturas
electrónicas y promociones.

Devolvés "desconocido" si no entendés el correo o si dudás de si entró plata.
Preferí "desconocido" antes que arriesgar: un pago inventado esconde una deuda
sin cobrar para siempre; un "desconocido" solo pone una fila para revisar.

Campos cuando la clase es "pago":
- monto_texto: la cifra COPIADA LITERAL del correo, sin la moneda y sin la
  puntuación final de la oración. De "por un monto de 377,742.05 CRC" va
  "377,742.05". No conviertas, no redondees, no reordenes los separadores.
- moneda: el código tal como aparece (${MONEDA}, USD...).
- remitente_nombre: quién mandó la plata, si el aviso lo dice. El BAC nunca lo
  dice: ahí va null. Nunca pongas el nombre del titular de la cuenta.
- referencia_detalle: el motivo o descripción que escribió quien paga, o el
  número de referencia. Es lo que más ayuda a cruzarlo con un pedido.
- confianza: qué tan seguro estás de que entró esa plata exacta.`;

let llamadasHechas = 0;
// Lo que la corrida aprendió del modelo, para que `index.ts` avise o resuelva
// la alerta. Ninguna de las dos en true = no se supo nada: la alerta que haya
// queda como está.
// ponytail: estado del módulo, vale porque el cron no se superpone. Si hay
// invocaciones concurrentes, devolver la salud junto con el resultado.
let anduvo = false;
let falla: string | null = null;

// La instancia de la función se reusa entre invocaciones, así que el
// presupuesto se reinicia al arrancar cada corrida y no al cargar el módulo.
export function reiniciarPresupuestoLlm() {
  llamadasHechas = 0;
  anduvo = false;
  falla = null;
}

export function saludLlm() {
  return { anduvo, falla };
}

async function cliente(): Promise<Anthropic | null> {
  // `globalThis.Deno?` y no `Deno` a secas: bajo vitest ese global no existe y
  // un ReferenceError acá haría fallar tests que no tienen nada que ver.
  const apiKey = globalThis.Deno?.env.get("ANTHROPIC_API_KEY");

  // Sin secreto no hay respaldo, y nada más: el poll sigue funcionando
  // exactamente como antes. Es lo que evita tener que poner la clave en local.
  if (!apiKey) return null;

  const { default: Sdk } = await import("npm:@anthropic-ai/sdk@0.127.0");
  return new Sdk({ apiKey });
}

async function preguntar(anthropic: Anthropic, remitente: string, cuerpo: string) {
  const respuesta = await anthropic.messages.create({
    model: MODELO,
    max_tokens: 4000,
    system: INSTRUCCIONES,
    output_config: { effort: "low", format: { type: "json_schema", schema: ESQUEMA } },
    messages: [{ role: "user", content: `De: ${remitente}\n\n${cuerpo}` }],
  });

  const bloque = respuesta.content.find((parte) => parte.type === "text");
  if (bloque?.type !== "text") throw new Error("El modelo no devolvió texto");

  return JSON.parse(bloque.text) as RespuestaLlm;
}

export interface ExtraccionLlm {
  resultado: ResultadoExtraccion;
  confianza: number;
}

const SIN_RESPALDO: ExtraccionLlm = { resultado: NO_RECONOCIDO, confianza: 0 };

function acotada(confianza: number): number {
  return Math.min(1, Math.max(0, confianza));
}

export async function extraerConLlm(remitente: string, cuerpo: string): Promise<ExtraccionLlm> {
  const anthropic = await cliente();
  if (!anthropic || cuerpo.length > LARGO_MAXIMO) return SIN_RESPALDO;
  if (llamadasHechas >= LLAMADAS_POR_CORRIDA) return SIN_RESPALDO;

  llamadasHechas += 1;

  try {
    const leido = await preguntar(anthropic, remitente, cuerpo);
    anduvo = true;
    return { resultado: leerRespuestaLlm(leido), confianza: acotada(leido.confianza) };
  } catch (error) {
    // Que el modelo falle no puede cortar el ingest: sin respaldo, el correo
    // queda como quedaba antes de que este archivo existiera.
    console.error("El respaldo LLM falló:", (error as Error).message);
    falla = explicarFallaLlm(error) ?? falla;
    return SIN_RESPALDO;
  }
}
