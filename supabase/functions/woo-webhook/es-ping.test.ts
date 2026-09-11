import { describe, expect, it } from "vitest";
import { esPingDeWoo } from "./es-ping";

describe("esPingDeWoo", () => {
  // WooCommerce manda esto al activar un webhook, sin firma HMAC, y espera 200.
  // Si recibe otra cosa se niega a activarlo:
  //   "Error: La URL de entrega devolvió un código de respuesta: 401"
  it("reconoce el ping de activación", () => {
    expect(esPingDeWoo("webhook_id=12")).toBe(true);
    expect(esPingDeWoo("webhook_id=1")).toBe(true);
    expect(esPingDeWoo(" webhook_id=7 ")).toBe(true);
  });

  it("no confunde un pedido real con un ping", () => {
    expect(esPingDeWoo('{"id":1234,"number":"1234"}')).toBe(false);
    expect(esPingDeWoo("")).toBe(false);
  });

  // El ping se responde 200 sin verificar firma. Que solo pase un cuerpo de
  // esta forma exacta es lo que impide que sirva para saltarse el HMAC.
  it("rechaza cualquier cosa pegada al parámetro", () => {
    expect(esPingDeWoo("webhook_id=12&admin=1")).toBe(false);
    expect(esPingDeWoo("webhook_id=abc")).toBe(false);
    expect(esPingDeWoo("xwebhook_id=12")).toBe(false);
    expect(esPingDeWoo("webhook_id=")).toBe(false);
  });
});
