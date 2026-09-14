import { describe, expect, it } from "vitest";
import { decodificarBase64, decodificarQuotedPrintable } from "./codificaciones.ts";
import { decodificarTexto } from "./charset.ts";

describe("decodificarBase64", () => {
  it("decodifica ignorando los saltos de línea que mete el correo", () => {
    expect(decodificarBase64("SG9sYSBt\r\ndW5kbw==")).toBe("Hola mundo");
  });

  it("lanza ante un cuerpo que dice ser base64 y no lo es", () => {
    expect(() => decodificarBase64("no-es-base64-!!")).toThrow(/base64/);
  });
});

describe("decodificarQuotedPrintable", () => {
  it("resuelve los octetos =XX", () => {
    expect(decodificarTexto(decodificarQuotedPrintable("Ana Mar=C3=ADa"), "utf-8")).toBe("Ana María");
  });

  it("borra los saltos suaves sin dejar el signo igual", () => {
    expect(decodificarQuotedPrintable("Davibank le infor=\r\nma")).toBe("Davibank le informa");
  });

  it("deja el guion bajo intacto en el cuerpo", () => {
    expect(decodificarQuotedPrintable("ana_maria")).toBe("ana_maria");
  });

  it("convierte el guion bajo en espacio solo en cabecera", () => {
    expect(decodificarQuotedPrintable("Ana_Mar=C3=ADa", true)).toContain("Ana Mar");
  });
});

describe("decodificarTexto", () => {
  it("usa utf-8 cuando el correo no declara charset", () => {
    expect(decodificarTexto("Mar\xc3\xada", null)).toBe("María");
  });

  it("honra un charset de un byte", () => {
    expect(decodificarTexto("Mar\xeda", "iso-8859-1")).toBe("María");
  });

  it("cae a windows-1252 ante un charset inventado, en vez de perder el correo", () => {
    expect(decodificarTexto("Pago", "charset-que-no-existe")).toBe("Pago");
  });
});
