import { describe, expect, it } from "vitest";
import { rolDelToken, vieneDeLaBase } from "./viene-de-la-base.ts";

// Un JWT de mentira: acá solo importa el payload, porque la firma ya la verificó
// el gateway antes de que la función corra.
function pedidoCon(payload: Record<string, unknown>): Request {
  const base64url = btoa(JSON.stringify(payload))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");

  return new Request("https://ejemplo.test", {
    headers: { Authorization: `Bearer cabecera.${base64url}.firma` },
  });
}

describe("vieneDeLaBase", () => {
  it("deja pasar a la service role, que es quien dispara desde el trigger", () => {
    expect(vieneDeLaBase(pedidoCon({ role: "service_role" }))).toBe(true);
  });

  // El caso que motivó todo: la publishable key es un JWT válido del proyecto y
  // viaja en el bundle que descarga el navegador.
  it("rechaza la publishable key, que trae role anon", () => {
    expect(vieneDeLaBase(pedidoCon({ role: "anon" }))).toBe(false);
  });

  it("rechaza a un usuario con sesión iniciada", () => {
    expect(vieneDeLaBase(pedidoCon({ role: "authenticated" }))).toBe(false);
  });

  it("rechaza un token sin claim de rol", () => {
    expect(vieneDeLaBase(pedidoCon({ sub: "alguien" }))).toBe(false);
  });

  it("rechaza cuando no viene la cabecera", () => {
    expect(vieneDeLaBase(new Request("https://ejemplo.test"))).toBe(false);
  });
});

describe("rolDelToken", () => {
  it("lee el rol de un payload en base64url sin relleno", () => {
    expect(rolDelToken(pedidoCon({ role: "service_role" }))).toBe("service_role");
  });

  // Un payload ilegible no puede tumbar la función: devuelve null y el llamador
  // decide, que es lo mismo que pasa con un token ausente.
  it("devuelve null ante un payload que no es base64 ni JSON", () => {
    const pedido = new Request("https://ejemplo.test", {
      headers: { Authorization: "Bearer cabecera.$$$no-es-base64$$$.firma" },
    });

    expect(rolDelToken(pedido)).toBeNull();
  });

  it("devuelve null cuando el bearer no tiene las tres partes", () => {
    const pedido = new Request("https://ejemplo.test", {
      headers: { Authorization: "Bearer suelto" },
    });

    expect(rolDelToken(pedido)).toBeNull();
  });
});
