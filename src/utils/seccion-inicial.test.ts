import { describe, expect, it } from "vitest";
import { SECCION } from "@/constants/secciones";
import { seccionInicial } from "./seccion-inicial";

describe("seccionInicial", () => {
  it("abre en la sección que pide el parámetro", () => {
    expect(seccionInicial("?seccion=pagos")).toBe(SECCION.PAGOS);
  });

  it("cae en Deben cuando no hay parámetro", () => {
    expect(seccionInicial("")).toBe(SECCION.DEBEN);
  });

  it("ignora una sección que no existe en vez de romper", () => {
    expect(seccionInicial("?seccion=contabilidad")).toBe(SECCION.DEBEN);
  });

  it("convive con otros parámetros", () => {
    expect(seccionInicial("?utm=correo&seccion=revisar")).toBe(SECCION.REVISAR);
  });
});
