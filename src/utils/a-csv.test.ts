import { describe, expect, it } from "vitest";
import { aCSV } from "./a-csv";

const SIN_BOM = (csv: string) => csv.slice(1);

describe("aCSV", () => {
  it("arranca con el BOM que Excel necesita para leer los acentos", () => {
    expect(aCSV(["a"], [["ñandú"]]).startsWith("\uFEFF")).toBe(true);
  });

  it("separa con punto y coma, que es lo que espera Excel en español", () => {
    expect(SIN_BOM(aCSV(["uno", "dos"], [["a", "b"]]))).toBe("uno;dos\r\na;b\r\n");
  });

  it("entrecomilla el campo que trae el separador para que no corra la columna", () => {
    expect(SIN_BOM(aCSV(["a"], [["Perez; Juan"]]))).toBe('a\r\n"Perez; Juan"\r\n');
  });

  it("escapa las comillas duplicandolas", () => {
    expect(SIN_BOM(aCSV(["a"], [['di "hola"']]))).toBe('a\r\n"di ""hola"""\r\n');
  });

  it("escribe la celda vacia cuando el valor es null", () => {
    expect(SIN_BOM(aCSV(["a", "b"], [[null, 1]]))).toBe("a;b\r\n;1\r\n");
  });

  // El motivo de un SINPE lo escribe quien paga. Sin este freno, un
  // "=HYPERLINK(...)" en ese campo llega a la hoja del dueño como formula viva.
  it("neutraliza la celda que Excel tomaria por formula", () => {
    expect(SIN_BOM(aCSV(["a"], [["=HYPERLINK(\"http://x\")"]]))).toBe(
      "a\r\n\"'=HYPERLINK(\"\"http://x\"\")\"\r\n",
    );
  });

  it("neutraliza tambien los otros arranques de formula", () => {
    for (const peligroso of ["+1", "-1", "@SUM(A1)"]) {
      expect(SIN_BOM(aCSV(["a"], [[peligroso]]))).toBe(`a\r\n'${peligroso}\r\n`);
    }
  });

  it("deja en paz un numero negativo ya convertido a texto por quien llama", () => {
    expect(SIN_BOM(aCSV(["a"], [[-5]]))).toBe("a\r\n'-5\r\n");
  });
});
