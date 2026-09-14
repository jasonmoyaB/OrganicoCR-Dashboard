import { describe, expect, it } from "vitest";
import { cuerpoDeFetch, finDeRespuesta, uidsDe, uidvalidityDe } from "./respuestas-imap.ts";

const bytes = (texto: string) => new TextEncoder().encode(texto);
const texto = (datos: Uint8Array) => new TextDecoder().decode(datos);

describe("uidsDe", () => {
  it("lee los UID de una respuesta de SEARCH", () => {
    expect(uidsDe("* SEARCH 4 17 231\r\na1 OK Search completed.\r\n")).toEqual([4, 17, 231]);
  });

  it("devuelve vacío cuando el buzón no tiene coincidencias", () => {
    expect(uidsDe("* SEARCH\r\na1 OK Search completed.\r\n")).toEqual([]);
  });

  it("devuelve vacío cuando no hay línea de SEARCH", () => {
    expect(uidsDe("a1 OK Search completed.\r\n")).toEqual([]);
  });
});

describe("uidvalidityDe", () => {
  it("lee el UIDVALIDITY del EXAMINE", () => {
    const examine = "* OK [UIDVALIDITY 1758000123] UIDs valid\r\na1 OK [READ-ONLY] Examine completed.\r\n";
    expect(uidvalidityDe(examine)).toBe(1758000123);
  });

  it("lanza si el servidor no lo anuncia, en vez de asumir uno", () => {
    expect(() => uidvalidityDe("a1 OK Examine completed.\r\n")).toThrow(/UIDVALIDITY/);
  });
});

describe("cuerpoDeFetch", () => {
  it("corta exactamente los bytes que el servidor anunció", () => {
    const cuerpo = "Subject: hola\r\n\r\nUn pago.";
    const crudo = `* 3 FETCH (UID 45 BODY[] {${cuerpo.length}}\r\n${cuerpo})\r\na1 OK Fetch completed.\r\n`;
    expect(texto(cuerpoDeFetch(bytes(crudo)))).toBe(cuerpo);
  });

  it("no se corta con un cuerpo que contiene líneas que parecen respuestas IMAP", () => {
    const cuerpo = "De: banco\r\n\r\n* SEARCH 1 2 3\r\na1 OK Fetch completed.\r\n)";
    const largo = bytes(cuerpo).length;
    const crudo = `* 3 FETCH (UID 45 BODY[] {${largo}}\r\n${cuerpo})\r\na9 OK Fetch completed.\r\n`;
    expect(texto(cuerpoDeFetch(bytes(crudo)))).toBe(cuerpo);
  });

  it("cuenta bytes y no caracteres cuando el cuerpo trae tildes", () => {
    const cuerpo = "Recibió ₡12.036,00 de Ana María";
    const largo = bytes(cuerpo).length;
    expect(largo).toBeGreaterThan(cuerpo.length);

    const crudo = bytes(`* 3 FETCH (UID 45 BODY[] {${largo}}\r\n`);
    const cierre = bytes(")\r\na1 OK Fetch completed.\r\n");
    const completo = new Uint8Array([...crudo, ...bytes(cuerpo), ...cierre]);

    expect(texto(cuerpoDeFetch(completo))).toBe(cuerpo);
  });

  it("lanza si la respuesta no trae literal", () => {
    expect(() => cuerpoDeFetch(bytes("a1 OK Fetch completed.\r\n"))).toThrow(/literal/);
  });

  it("lanza si llegaron menos bytes de los anunciados", () => {
    expect(() => cuerpoDeFetch(bytes("* 3 FETCH (UID 45 BODY[] {500}\r\ncorto"))).toThrow(/incompleto/);
  });
});

describe("finDeRespuesta", () => {
  const dato = (texto: string) => new TextEncoder().encode(texto);

  it("señala el final cuando llegó la línea con la etiqueta", () => {
    const crudo = "* SEARCH 1 2\r\na1 OK Search completed.\r\n";
    expect(finDeRespuesta(dato(crudo), "a1")).toBe(crudo.length);
  });

  it("dice que falta leer cuando la etiqueta todavía no llegó", () => {
    expect(finDeRespuesta(dato("* SEARCH 1 2\r\n"), "a1")).toBe(-1);
  });

  it("dice que falta leer cuando la última línea viene cortada", () => {
    expect(finDeRespuesta(dato("* SEARCH 1 2\r\na1 OK Search com"), "a1")).toBe(-1);
  });

  it("no confunde el cierre con una línea igual dentro del cuerpo de un correo", () => {
    const cuerpo = "De: banco\r\na1 OK Search completed.\r\nFin";
    const largo = dato(cuerpo).length;
    const crudo = `* 3 FETCH (UID 9 BODY[] {${largo}}\r\n${cuerpo})\r\na1 OK Fetch completed.\r\n`;

    expect(finDeRespuesta(dato(crudo), "a1")).toBe(dato(crudo).length);
  });

  it("espera a que llegue el literal completo antes de dar por cerrada la respuesta", () => {
    const parcial = "* 3 FETCH (UID 9 BODY[] {500}\r\nsolo unos pocos bytes";
    expect(finDeRespuesta(dato(parcial), "a1")).toBe(-1);
  });

  it("reconoce NO y BAD, no solo OK", () => {
    const fallo = "a7 NO [AUTHENTICATIONFAILED] Authentication failed.\r\n";
    expect(finDeRespuesta(dato(fallo), "a7")).toBe(fallo.length);
  });

  it("no toma a12 por a1", () => {
    expect(finDeRespuesta(dato("a12 OK Done.\r\n"), "a1")).toBe(-1);
  });
});
