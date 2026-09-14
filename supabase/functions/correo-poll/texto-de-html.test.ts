import { describe, expect, it } from "vitest";
import { textoDeHtml } from "./texto-de-html.ts";

describe("textoDeHtml", () => {
  it("descarta el contenido de script y style", () => {
    const html = "<style>p{color:red}</style><p>Pago</p><script>alert(1)</script>";
    expect(textoDeHtml(html)).toBe("Pago");
  });

  it("convierte los cierres de bloque en saltos de línea", () => {
    expect(textoDeHtml("<p>uno</p><p>dos</p>")).toBe("uno\ndos");
  });

  it("resuelve entidades nombradas y numéricas", () => {
    expect(textoDeHtml("M&oacute;vil &amp; M&#243;vil &#xF3;")).toBe("Móvil & Móvil ó");
  });
});
