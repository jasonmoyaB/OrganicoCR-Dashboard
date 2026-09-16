import { describe, expect, it } from "vitest";
import { queryClient } from "./query-client";

describe("queryClient", () => {
  const defaults = queryClient.getDefaultOptions().queries;

  it("refresca solo mientras la pestaña está a la vista", () => {
    expect(defaults?.refetchInterval).toBe(60_000);
  });

  // Si esto se pone en true, el dashboard consulta la base con la app
  // minimizada y sin nadie mirando. Quien avisa con la app cerrada es el push.
  it("no consulta con la pestaña oculta", () => {
    expect(defaults?.refetchIntervalInBackground).toBe(false);
  });

  it("refresca al volver a la pestaña, sin esperar el intervalo", () => {
    expect(defaults?.refetchOnWindowFocus).toBe(true);
  });
});
