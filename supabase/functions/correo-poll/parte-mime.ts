// Elige qué parte de un correo MIME es el texto que hay que leer.
//
// Los avisos del banco llegan como `multipart/alternative` con la misma
// información dos veces: `text/plain` y `text/html`. Se prefiere el plano
// porque el HTML obliga a despojar etiquetas y ahí se pierde formato del
// monto; pero si el plano no viene, el HTML sirve igual.

import { parametroDe, partirMensaje } from "./cabeceras-rfc822.ts";
import { decodificarTexto } from "./charset.ts";
import { decodificarBase64, decodificarQuotedPrintable } from "./codificaciones.ts";
import { textoDeHtml } from "./texto-de-html.ts";

// Un correo anidado más hondo que esto es un adjunto raro o un intento de
// agotar la pila, no un aviso de pago.
const MAX_PROFUNDIDAD = 5;
const TIPO_POR_DEFECTO = "text/plain";

const DECODIFICADORES: Record<string, (cuerpo: string) => string> = {
  base64: decodificarBase64,
  "quoted-printable": (cuerpo) => decodificarQuotedPrintable(cuerpo),
};

function fronteraDe(tipo: string): string | null {
  if (!tipo.toLowerCase().trim().startsWith("multipart/")) return null;
  return parametroDe(tipo, "boundary");
}

function partirPorFrontera(cuerpo: string, frontera: string): string[] {
  const separador = `--${frontera}`;
  return cuerpo
    .split(separador)
    .slice(1, -1)
    .map((parte) => parte.replace(/^\r?\n/, ""));
}

function textoDeParteSimple(tipo: string, cabeceras: Map<string, string>, cuerpo: string): string {
  const codificacion = (cabeceras.get("content-transfer-encoding") ?? "").toLowerCase().trim();
  const decodificar = DECODIFICADORES[codificacion];
  const bytes = decodificar ? decodificar(cuerpo) : cuerpo;
  const texto = decodificarTexto(bytes, parametroDe(tipo, "charset"));

  return tipo.toLowerCase().trim().startsWith("text/html") ? textoDeHtml(texto) : texto;
}

function esPlano(cabeceras: Map<string, string>): boolean {
  const tipo = (cabeceras.get("content-type") ?? TIPO_POR_DEFECTO).toLowerCase().trim();
  return tipo.startsWith("text/plain");
}

export function textoDeMensaje(
  cabeceras: Map<string, string>,
  cuerpo: string,
  profundidad = 0,
): string {
  const tipo = cabeceras.get("content-type") ?? TIPO_POR_DEFECTO;
  const frontera = fronteraDe(tipo);

  if (!frontera || profundidad >= MAX_PROFUNDIDAD) {
    return intentarParteSimple(tipo, cabeceras, cuerpo);
  }

  return mejorDeLasPartes(partirPorFrontera(cuerpo, frontera), profundidad);
}

// Una parte ilegible —base64 corrupto, charset inventado— no puede tumbar el
// correo entero: se devuelve vacío y gana otra parte, o queda el cuerpo crudo
// en `correos_banco` para re-procesarlo después.
function intentarParteSimple(
  tipo: string,
  cabeceras: Map<string, string>,
  cuerpo: string,
): string {
  try {
    return textoDeParteSimple(tipo, cabeceras, cuerpo);
  } catch {
    return "";
  }
}

function mejorDeLasPartes(partes: string[], profundidad: number): string {
  let respaldoHtml = "";

  for (const parte of partes) {
    const { cabeceras, cuerpo } = partirMensaje(parte);
    const texto = textoDeMensaje(cabeceras, cuerpo, profundidad + 1).trim();
    if (!texto) continue;

    if (esPlano(cabeceras)) return texto;
    respaldoHtml ||= texto;
  }

  return respaldoHtml;
}
