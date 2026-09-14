// Bloque de cabeceras de un correo: separarlo del cuerpo, desplegarlo y leerlo.

import { decodificarTexto } from "./charset.ts";
import { decodificarBase64, decodificarQuotedPrintable } from "./codificaciones.ts";

const LINEA_EN_BLANCO = /\r?\n\r?\n/;
// Una cabecera larga se parte en varias líneas y las continuaciones empiezan
// con espacio o tab. Sin volver a unirlas, un asunto largo o un Message-ID
// partido se leen a medias.
const CONTINUACION = /\r?\n[ \t]+/g;
const NOMBRE_Y_VALOR = /^([^:]+):\s?([\s\S]*)$/;

const PALABRA_CODIFICADA = /=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g;
const ENTRE_PALABRAS = /(\?=)\s+(=\?)/g;
const SUFIJO_DE_IDIOMA = /\*.*$/;

export interface MensajePartido {
  cabeceras: Map<string, string>;
  cuerpo: string;
}

export function partirMensaje(crudo: string): MensajePartido {
  const corte = LINEA_EN_BLANCO.exec(crudo);
  const bloque = corte ? crudo.slice(0, corte.index) : crudo;
  const cuerpo = corte ? crudo.slice(corte.index + corte[0].length) : "";

  return { cabeceras: leerCabeceras(bloque), cuerpo };
}

function leerCabeceras(bloque: string): Map<string, string> {
  const cabeceras = new Map<string, string>();

  for (const linea of bloque.replace(CONTINUACION, " ").split(/\r?\n/)) {
    const partes = NOMBRE_Y_VALOR.exec(linea);
    if (!partes) continue;

    // La primera gana: `Received` aparece una vez por salto, y una cabecera
    // repetida en un correo falsificado no debe pisar a la legítima.
    const nombre = partes[1].trim().toLowerCase();
    if (!cabeceras.has(nombre)) cabeceras.set(nombre, partes[2].trim());
  }

  return cabeceras;
}

// RFC 2047: `=?utf-8?B?...?=` dentro de Subject o From. Davibank manda español
// con tildes, así que sin esto el nombre del remitente llega ilegible.
export function decodificarPalabras(valor: string): string {
  return valor
    .replace(ENTRE_PALABRAS, "$1$2")
    .replace(PALABRA_CODIFICADA, (todo, charset: string, tipo: string, texto: string) => {
      try {
        const bytes = tipo.toUpperCase() === "B"
          ? decodificarBase64(texto)
          : decodificarQuotedPrintable(texto, true);
        return decodificarTexto(bytes, charset.toLowerCase().replace(SUFIJO_DE_IDIOMA, ""));
      } catch {
        // Una palabra mal formada no justifica descartar la cabecera entera.
        return todo;
      }
    });
}

// El nombre del parámetro se interpola sobre un literal de expresión regular
// en vez de armar la cadena a mano: dentro de un template literal, `\s` no es
// un escape válido y JavaScript lo colapsa a `s` sin avisar.
const PARAMETRO = /;\s*NOMBRE\s*=\s*(?:"([^"]*)"|([^;\s]+))/;

export function parametroDe(valor: string, nombre: string): string | null {
  const patron = new RegExp(PARAMETRO.source.replace("NOMBRE", nombre), "i");
  const encontrado = patron.exec(valor);

  return encontrado ? (encontrado[1] ?? encontrado[2]) : null;
}
