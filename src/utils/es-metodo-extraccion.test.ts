import { describe, expect, it } from "vitest";
import { esMetodoExtraccion } from "./es-metodo-extraccion";

describe("esMetodoExtraccion", () => {
  it("acepta los dos métodos del check constraint", () => {
    expect(esMetodoExtraccion("regex")).toBe(true);
    expect(esMetodoExtraccion("llm")).toBe(true);
  });

  it("rechaza un método que la base todavía no tiene", () => {
    expect(esMetodoExtraccion("manual")).toBe(false);
  });

  it("rechaza cadena vacía y variantes de mayúsculas", () => {
    expect(esMetodoExtraccion("")).toBe(false);
    expect(esMetodoExtraccion("LLM")).toBe(false);
  });
});
