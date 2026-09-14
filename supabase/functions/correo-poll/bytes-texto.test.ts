import { describe, expect, it } from "vitest";
import { aBytes, aCadenaDeBytes } from "./bytes-texto.ts";

describe("bytes-texto", () => {
  it("conserva todos los bytes posibles en el viaje de ida y vuelta", () => {
    const todos = Uint8Array.from({ length: 256 }, (_, i) => i);
    expect(aBytes(aCadenaDeBytes(todos))).toEqual(todos);
  });

  it("no remapea el rango 0x80-0x9F como haría windows-1252", () => {
    const cadena = aCadenaDeBytes(Uint8Array.of(0x80, 0x93, 0x9f));
    expect([...cadena].map((c) => c.charCodeAt(0))).toEqual([0x80, 0x93, 0x9f]);
  });

  it("aguanta una entrada más larga que el trozo sin desbordar la pila", () => {
    const largo = Uint8Array.from({ length: 50_000 }, (_, i) => i % 256);
    expect(aBytes(aCadenaDeBytes(largo))).toEqual(largo);
  });
});
