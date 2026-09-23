import { describe, expect, it } from "vitest";
import { explicarFallaLlm } from "./falla-llm.ts";

describe("explicarFallaLlm", () => {
  it("avisa cuando se acabaron los créditos", () => {
    const error = {
      status: 400,
      message: "Your credit balance is too low to access the Anthropic API.",
    };

    expect(explicarFallaLlm(error)).toMatch(/sin créditos/);
  });

  it("avisa cuando la clave ya no sirve", () => {
    expect(explicarFallaLlm({ status: 401, message: "invalid x-api-key" })).toMatch(/clave/);
  });

  // Se arreglan solas: una alerta por esto quedaría encendida hasta la próxima
  // llamada al modelo, que puede ser en semanas.
  it.each([429, 500, 529])("calla ante un %i pasajero", (status) => {
    expect(explicarFallaLlm({ status, message: "overloaded" })).toBeNull();
  });

  it("calla ante un 400 que no es de créditos", () => {
    expect(explicarFallaLlm({ status: 400, message: "invalid schema" })).toBeNull();
  });
});
