import { describe, expect, it } from "vitest";
import { extraerPago } from "../_extractor/extraer-pago.ts";
import { pagoDe } from "../_extractor/resultado-extraccion.ts";

const extraer = (from: string, cuerpo: string) => pagoDe(extraerPago(from, cuerpo));
import { parsearCorreo } from "./mensaje-rfc822.ts";

const bytes = (texto: string) => new TextEncoder().encode(texto);
const base64 = (texto: string) => Buffer.from(texto, "utf8").toString("base64");

const AVISO = "Davibank le informa ha recibido 12.036,00 colones de ANA MARIA SOLANO JEREZ al SINPE Movil";

describe("parsearCorreo", () => {
  it("lee un aviso de texto plano en quoted-printable", () => {
    const crudo = [
      "Message-ID: <aviso-1@davibank.cr>",
      "From: Davibank <servicioalcliente@davibank.cr>",
      "Subject: =?UTF-8?B?QXZpc28gZGUgU0lOUEUgTcOzdmls?=",
      "Date: Fri, 12 Sep 2026 09:14:00 -0600",
      "Content-Type: text/plain; charset=UTF-8",
      "Content-Transfer-Encoding: quoted-printable",
      "",
      "Davibank le informa ha recibido 12.036,00 colones de ANA MARIA SOLANO=",
      " JEREZ al SINPE M=C3=B3vil",
    ].join("\r\n");

    const correo = parsearCorreo(bytes(crudo));

    expect(correo.mensajeId).toBe("<aviso-1@davibank.cr>");
    expect(correo.remitente).toBe("Davibank <servicioalcliente@davibank.cr>");
    expect(correo.asunto).toBe("Aviso de SINPE Móvil");
    expect(correo.fecha?.toISOString()).toBe("2026-09-12T15:14:00.000Z");
    expect(correo.cuerpo).toContain("ANA MARIA SOLANO JEREZ");
  });

  it("prefiere la parte text/plain de un multipart/alternative", () => {
    const crudo = [
      "Message-ID: <aviso-2@davibank.cr>",
      "From: servicioalcliente@davibank.cr",
      'Content-Type: multipart/alternative; boundary="frontera-xyz"',
      "",
      "Esto es el preámbulo y nadie lo lee.",
      "--frontera-xyz",
      "Content-Type: text/plain; charset=UTF-8",
      "",
      AVISO,
      "--frontera-xyz",
      "Content-Type: text/html; charset=UTF-8",
      "",
      "<html><body><p>version en html</p></body></html>",
      "--frontera-xyz--",
      "",
    ].join("\r\n");

    expect(parsearCorreo(bytes(crudo)).cuerpo).toBe(AVISO);
  });

  it("cae al HTML cuando el correo no trae parte de texto plano", () => {
    const html = `<html><body><p>${AVISO}</p></body></html>`;
    const crudo = [
      "Message-ID: <aviso-3@davibank.cr>",
      "From: servicioalcliente@davibank.cr",
      'Content-Type: multipart/alternative; boundary="f1"',
      "",
      "--f1",
      "Content-Type: text/html; charset=UTF-8",
      "Content-Transfer-Encoding: base64",
      "",
      base64(html),
      "--f1--",
      "",
    ].join("\r\n");

    expect(parsearCorreo(bytes(crudo)).cuerpo).toBe(AVISO);
  });

  it("entra a un multipart anidado dentro de otro", () => {
    const crudo = [
      "Message-ID: <aviso-4@davibank.cr>",
      "From: servicioalcliente@davibank.cr",
      'Content-Type: multipart/mixed; boundary="externa"',
      "",
      "--externa",
      'Content-Type: multipart/alternative; boundary="interna"',
      "",
      "--interna",
      "Content-Type: text/plain; charset=UTF-8",
      "",
      AVISO,
      "--interna--",
      "--externa--",
      "",
    ].join("\r\n");

    expect(parsearCorreo(bytes(crudo)).cuerpo).toContain("ANA MARIA SOLANO JEREZ");
  });

  it("devuelve null en lugar de inventar un Message-ID o una fecha", () => {
    const correo = parsearCorreo(bytes("From: banco@x.cr\r\n\r\ncuerpo"));

    expect(correo.mensajeId).toBeNull();
    expect(correo.fecha).toBeNull();
    expect(correo.asunto).toBeNull();
  });

  it("no lanza ante una parte con base64 corrupto: deja el resto utilizable", () => {
    const crudo = [
      "Message-ID: <roto@davibank.cr>",
      "From: servicioalcliente@davibank.cr",
      "Content-Type: text/plain; charset=UTF-8",
      "Content-Transfer-Encoding: base64",
      "",
      "esto-no-es-base64-!!!",
    ].join("\r\n");

    const correo = parsearCorreo(bytes(crudo));

    expect(correo.mensajeId).toBe("<roto@davibank.cr>");
    expect(correo.cuerpo).toBe("");
  });
});

describe("la cadena completa: correo crudo -> pago extraído", () => {
  it("saca monto y remitente de un aviso de Davibank en HTML", () => {
    const html = `<html><body><table><tr><td>Davibank le informa ha recibido
      <b>12.036,00</b>&nbsp;colones de <span>ANA MARIA SOLANO JEREZ</span> al SINPE M&oacute;vil</td></tr></table></body></html>`;

    const crudo = [
      "Message-ID: <cadena@davibank.cr>",
      "From: Davibank <servicioalcliente@davibank.cr>",
      "Content-Type: text/html; charset=UTF-8",
      "",
      html,
    ].join("\r\n");

    const correo = parsearCorreo(bytes(crudo));
    const pago = extraer(correo.remitente, correo.cuerpo);

    expect(pago).not.toBeNull();
    expect(pago?.montoCentimos).toBe(1_203_600);
    expect(pago?.remitenteNombre).toBe("ANA MARIA SOLANO JEREZ");
  });
});
