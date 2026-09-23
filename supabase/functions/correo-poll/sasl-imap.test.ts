import { describe, expect, it } from "vitest";
import { entrecomillar, soportaPlain, tokenPlain } from "./sasl-imap.ts";

describe("tokenPlain", () => {
  it("arma el token de SASL PLAIN con los NUL en su lugar", () => {
    expect(atob(tokenPlain("info@organicocr.store", "clave"))).toBe(
      "\0info@organicocr.store\0clave",
    );
  });

  it("no necesita escapar una clave con comillas ni backslashes", () => {
    const clave = 'con "comillas" y \\ backslash';
    expect(atob(tokenPlain("info", clave))).toBe(`\0info\0${clave}`);
  });

  it("codifica en UTF-8 una clave con tildes", () => {
    const bytes = atob(tokenPlain("info", "ñandú"));
    expect(new TextDecoder().decode(Uint8Array.from(bytes, (c) => c.charCodeAt(0)))).toBe(
      "\0info\0ñandú",
    );
  });
});

describe("entrecomillar", () => {
  it("envuelve el valor entre comillas", () => {
    expect(entrecomillar("clave")).toBe('"clave"');
  });

  it("escapa las comillas para que no corten la orden", () => {
    expect(entrecomillar('cla"ve')).toBe('"cla\\"ve"');
  });

  it("escapa los backslashes antes que nada", () => {
    expect(entrecomillar("cla\\ve")).toBe('"cla\\\\ve"');
  });

  // Un quoted-string de IMAP no admite CR ni LF. Colarlos es lo que convierte
  // una orden en dos, así que se rechaza en vez de escaparse.
  it("rechaza un salto de línea, que partiría la orden en dos", () => {
    expect(() => entrecomillar('info@x.cr"\r\nA001 DELETE INBOX')).toThrow(
      /caracteres de control/,
    );
  });

  it("rechaza un NUL", () => {
    expect(() => entrecomillar("info\0oculto")).toThrow(/caracteres de control/);
  });

  it("deja pasar un remitente normal", () => {
    expect(entrecomillar("servicioalcliente@davibank.cr")).toBe(
      '"servicioalcliente@davibank.cr"',
    );
  });
});

describe("soportaPlain", () => {
  it("reconoce lo que anuncia Dovecot", () => {
    const capacidades = "* CAPABILITY IMAP4rev1 SASL-IR AUTH=PLAIN AUTH=LOGIN";
    expect(soportaPlain(capacidades)).toBe(true);
  });

  it("dice que no cuando el servidor solo ofrece LOGIN", () => {
    expect(soportaPlain("* CAPABILITY IMAP4rev1 LITERAL+ AUTH=LOGIN")).toBe(false);
  });
});
