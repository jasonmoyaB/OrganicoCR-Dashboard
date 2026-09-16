import { describe, expect, it } from "vitest";
import { base64urlABytes } from "./base64url-a-bytes";

describe("base64urlABytes", () => {
  it("decodifica base64 común sin relleno que agregar", () => {
    expect([...base64urlABytes("AQAB")]).toEqual([1, 0, 1]);
  });

  it("traduce los dos caracteres propios de base64url", () => {
    // "-_8" es "+/8" en base64 clásico. Sin la traducción, atob lo rechaza.
    expect([...base64urlABytes("-_8")]).toEqual([0xfb, 0xff]);
  });

  it("repone el relleno que base64url omite", () => {
    expect([...base64urlABytes("QQ")]).toEqual([0x41]);
  });

  it("devuelve los 65 bytes de una llave VAPID real", () => {
    // Una llave de servidor de aplicación es un punto P-256 sin comprimir:
    // 0x04 y dos coordenadas de 32 bytes. Si el largo no da 65, el navegador
    // rechaza la suscripción sin decir por qué.
    const llave =
      "BEl62iUYgUivxIkv69yViEuiBIa1-U5-lKZmDBMpfZhkEfKlkpYpZ4jM9lMOqBpfLGrQ0-nKqKUbLFFtDLcBPfE";

    const bytes = base64urlABytes(llave);

    expect(bytes).toHaveLength(65);
    expect(bytes[0]).toBe(0x04);
  });
});
