import { describe, expect, it } from "vitest";
import { verificarFirma } from "./verificar-firma";

const SECRETO = "secreto-de-prueba";
const CUERPO = '{"id":1234}';
// HMAC-SHA256 de CUERPO con SECRETO, en base64. Valor de referencia, generado con:
//   node -e "console.log(require('crypto').createHmac('sha256','secreto-de-prueba').update('{\"id\":1234}').digest('base64'))"
const FIRMA_VALIDA = "cg4lAGu97/ReGhTYqOVuPTX3txi8EntNaKcZVLeXCR4=";

describe("verificarFirma", () => {
  it("acepta una firma correcta", async () => {
    expect(await verificarFirma(CUERPO, FIRMA_VALIDA, SECRETO)).toBe(true);
  });

  it("rechaza una firma alterada", async () => {
    expect(await verificarFirma(CUERPO, "AAAA", SECRETO)).toBe(false);
  });

  it("rechaza un cuerpo alterado con firma válida", async () => {
    expect(await verificarFirma('{"id":9999}', FIRMA_VALIDA, SECRETO)).toBe(false);
  });

  it("rechaza una firma ausente", async () => {
    expect(await verificarFirma(CUERPO, null, SECRETO)).toBe(false);
  });

  // Un secreto mal configurado no puede parecerse a un secreto correcto.
  it("rechaza una firma válida calculada con otro secreto", async () => {
    expect(await verificarFirma(CUERPO, FIRMA_VALIDA, "otro-secreto")).toBe(false);
  });
});
