import { describe, expect, it } from "vitest";
import { direccionRemitente } from "./direccion-remitente";

describe("direccionRemitente", () => {
  it("saca la dirección de un From con nombre para mostrar", () => {
    expect(direccionRemitente('"Davibank" <servicioalcliente@davibank.cr>')).toBe(
      "servicioalcliente@davibank.cr",
    );
    expect(direccionRemitente("Davibank Notificaciones <servicioalcliente@davibank.cr>")).toBe(
      "servicioalcliente@davibank.cr",
    );
  });

  it("acepta un From que ya es solo la dirección", () => {
    expect(direccionRemitente("servicioalcliente@davibank.cr")).toBe(
      "servicioalcliente@davibank.cr",
    );
  });

  // El From llega como lo escribió el servidor del banco. Comparar sin
  // normalizar haría que "Servicioalcliente@Davibank.cr" no encuentre su
  // extractor y el pago cayera al LLM sin necesidad.
  it("normaliza mayúsculas y espacios", () => {
    expect(direccionRemitente("  <ServicioAlCliente@DaviBank.CR>  ")).toBe(
      "servicioalcliente@davibank.cr",
    );
  });

  it("devuelve cadena vacía si no hay nada que parezca una dirección", () => {
    expect(direccionRemitente("desconocido")).toBe("");
    expect(direccionRemitente("")).toBe("");
  });
});
