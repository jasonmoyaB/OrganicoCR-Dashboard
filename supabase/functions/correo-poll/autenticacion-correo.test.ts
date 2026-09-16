import { describe, expect, it } from "vitest";
import { veredictoDe } from "./autenticacion-correo.ts";

describe("veredictoDe", () => {
  it("acepta lo que firma y alinea", () => {
    expect(
      veredictoDe("mx.organicocr.store; dkim=pass header.d=davibank.cr; dmarc=pass"),
    ).toBe("pasa");
  });

  // El caso que motiva el módulo: alguien escribiendo desde fuera con el
  // `From` del banco.
  it("rechaza un dmarc fallido", () => {
    expect(veredictoDe("mx.organicocr.store; spf=fail; dkim=fail; dmarc=fail")).toBe("falla");
  });

  // DMARC pasa si alinea DKIM **o** SPF, asi que un dkim=fail con dmarc=pass es
  // un reenvio normal. Bloquearlo perderia avisos buenos.
  it("deja pasar dkim=fail cuando dmarc pasa", () => {
    expect(veredictoDe("mx.organicocr.store; dkim=fail; dmarc=pass")).toBe("pasa");
  });

  it("usa dkim cuando no hay dmarc", () => {
    expect(veredictoDe("mx.organicocr.store; dkim=fail header.d=davibank.cr")).toBe("falla");
  });

  // SPF falla de forma rutinaria en reenvios: no alcanza para descartar plata.
  it("no descarta por spf solo", () => {
    expect(veredictoDe("mx.organicocr.store; spf=fail smtp.mailfrom=davibank.cr")).toBe(
      "sin-datos",
    );
  });

  it("trata 'none' como que no se pudo comprobar, no como fraude", () => {
    expect(veredictoDe("mx.organicocr.store; dmarc=none; dkim=none")).toBe("sin-datos");
  });

  it("no inventa un veredicto cuando el servidor no puso la cabecera", () => {
    expect(veredictoDe(null)).toBe("sin-datos");
    expect(veredictoDe(undefined)).toBe("sin-datos");
    expect(veredictoDe("")).toBe("sin-datos");
  });

  it("lee sin importar mayusculas ni espacios", () => {
    expect(veredictoDe("mx; DMARC = PASS")).toBe("pasa");
  });

  // "dmarc" no puede dar positivo dentro de otra palabra del header.
  it("no confunde un metodo con parte de otra palabra", () => {
    expect(veredictoDe("mx; x-dmarc-interno=fail; dmarc=pass")).toBe("pasa");
  });
});
