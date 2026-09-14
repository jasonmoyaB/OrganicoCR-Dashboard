import { describe, expect, it } from "vitest";
import { decodificarPalabras, parametroDe, partirMensaje } from "./cabeceras-rfc822.ts";

describe("partirMensaje", () => {
  it("separa cabeceras y cuerpo por la primera línea en blanco", () => {
    const { cabeceras, cuerpo } = partirMensaje(
      "From: banco\r\nSubject: Aviso\r\n\r\nRecibió 5000 colones\r\n\r\nGracias",
    );

    expect(cabeceras.get("from")).toBe("banco");
    expect(cuerpo).toBe("Recibió 5000 colones\r\n\r\nGracias");
  });

  it("vuelve a unir una cabecera partida en varias líneas", () => {
    const { cabeceras } = partirMensaje("Message-ID: <abc\r\n def@davibank.cr>\r\n\r\ncuerpo");
    expect(cabeceras.get("message-id")).toBe("<abc def@davibank.cr>");
  });

  it("normaliza el nombre de la cabecera a minúsculas", () => {
    const { cabeceras } = partirMensaje("MESSAGE-ID: <x@y>\r\n\r\n");
    expect(cabeceras.get("message-id")).toBe("<x@y>");
  });

  it("conserva la primera aparición de una cabecera repetida", () => {
    const { cabeceras } = partirMensaje("From: real@banco.cr\r\nFrom: falso@ladron.cr\r\n\r\n");
    expect(cabeceras.get("from")).toBe("real@banco.cr");
  });

  it("no revienta con un mensaje sin cuerpo", () => {
    const { cabeceras, cuerpo } = partirMensaje("Subject: vacío");
    expect(cabeceras.get("subject")).toBe("vacío");
    expect(cuerpo).toBe("");
  });
});

describe("decodificarPalabras", () => {
  it("decodifica una palabra codificada en base64", () => {
    expect(decodificarPalabras("=?UTF-8?B?QW5hIE1hcsOtYQ==?=")).toBe("Ana María");
  });

  it("decodifica una palabra codificada en quoted-printable", () => {
    expect(decodificarPalabras("=?UTF-8?Q?Ana_Mar=C3=ADa?=")).toBe("Ana María");
  });

  it("pega dos palabras codificadas seguidas sin dejar el espacio de separación", () => {
    expect(decodificarPalabras("=?UTF-8?Q?Ana_?= =?UTF-8?Q?Mar=C3=ADa?=")).toBe("Ana María");
  });

  it("deja intacto el texto que no viene codificado", () => {
    expect(decodificarPalabras("Aviso de SINPE Movil")).toBe("Aviso de SINPE Movil");
  });

  it("devuelve la palabra cruda si está mal formada, en vez de perder la cabecera", () => {
    const rota = "Aviso =?UTF-8?B?no-es-base64!!?= final";
    expect(decodificarPalabras(rota)).toBe(rota);
  });
});

describe("parametroDe", () => {
  it("lee un parámetro entre comillas", () => {
    expect(parametroDe('multipart/alternative; boundary="--xyz--"', "boundary")).toBe("--xyz--");
  });

  it("lee un parámetro sin comillas", () => {
    expect(parametroDe("text/plain; charset=iso-8859-1", "charset")).toBe("iso-8859-1");
  });

  it("devuelve null cuando el parámetro no está", () => {
    expect(parametroDe("text/plain", "charset")).toBeNull();
  });
});
