import { describe, expect, it } from "vitest";
import { coincideBusqueda } from "./coincide-busqueda";

describe("coincideBusqueda", () => {
  it("encuentra el nombre del banco escrito como lo escribe una persona", () => {
    expect(coincideBusqueda("Mariella lo", ["MARIELLA_LO_VEGA"])).toBe(true);
  });

  it("ignora tildes y el orden de las palabras", () => {
    expect(coincideBusqueda("vegá mariella", ["MARIELLA_LO_VEGA"])).toBe(true);
  });

  it("busca en todos los campos y trata null como vacío", () => {
    expect(coincideBusqueda("cafe", [null, "Café", "1068"])).toBe(true);
  });

  it("exige todas las palabras", () => {
    expect(coincideBusqueda("mariella rojas", ["MARIELLA_LO_VEGA"])).toBe(false);
  });

  it("una búsqueda vacía deja pasar todo", () => {
    expect(coincideBusqueda("   ", [null])).toBe(true);
  });
});
