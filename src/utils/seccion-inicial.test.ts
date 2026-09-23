import { describe, expect, it } from "vitest";
import { SECCION } from "@/constants/secciones";
import { seccionInicial } from "./seccion-inicial";

describe("seccionInicial", () => {
  it("abre en la sección que pide el parámetro", () => {
    expect(seccionInicial("/", "?seccion=pagos")).toBe(SECCION.PAGOS);
  });

  it("cae en Deben cuando no hay parámetro", () => {
    expect(seccionInicial("/", "")).toBe(SECCION.DEBEN);
  });

  it("devuelve null (404) ante una sección que no existe", () => {
    expect(seccionInicial("/", "?seccion=contabilidad")).toBeNull();
  });

  it("devuelve null (404) ante una ruta que no existe", () => {
    expect(seccionInicial("/facturas", "")).toBeNull();
  });

  it("convive con otros parámetros", () => {
    expect(seccionInicial("/", "?utm=correo&seccion=revisar")).toBe(SECCION.REVISAR);
  });
});
