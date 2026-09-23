import { describe, expect, it } from "vitest";
import { explicarError } from "./explicar-error";

describe("explicarError", () => {
  it.each([
    "No se pudieron cargar los pagos: TypeError: Failed to fetch",
    "NetworkError when attempting to fetch resource.",
    "Load failed",
  ])("reconoce la caída de red de cada navegador: %s", (mensaje) => {
    const explicado = explicarError(new Error(mensaje));

    expect(explicado.titulo).toBe("Sin conexión con la base de datos");
    expect(explicado.deConexion).toBe(true);
  });

  it("reconoce la base caída detrás del gateway", () => {
    expect(explicarError(new Error("503 Service Unavailable")).deConexion).toBe(true);
  });

  it("explica la sesión vencida sin prender el aviso de conexión", () => {
    const explicado = explicarError(new Error("JWT expired"));

    expect(explicado.titulo).toBe("La sesión venció");
    expect(explicado.deConexion).toBe(false);
  });

  // Los services ya escriben en español: un error desconocido se muestra tal cual.
  it("deja pasar el mensaje de un error que no reconoce", () => {
    const explicado = explicarError(new Error("No se pudo marcar como pagado: violates check"));

    expect(explicado.detalle).toBe("No se pudo marcar como pagado: violates check");
  });

  it("no revienta con algo que no es un Error", () => {
    expect(explicarError("texto suelto").tecnico).toBe("texto suelto");
  });

  // Un número de pedido no puede pasar por error del gateway.
  it("no confunde un 503 dentro de otro número", () => {
    expect(explicarError(new Error("pedido 15030 duplicado")).deConexion).toBe(false);
  });
});
