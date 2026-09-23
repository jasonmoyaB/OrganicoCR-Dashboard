// Minúsculas, sin tildes y con los guiones bajos como espacios: Davibank manda
// el nombre como "MARIELLA_LO_VEGA" y el dueño escribe "mariela lo" o "Maríella".
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replaceAll("_", " ")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

// Cada palabra buscada tiene que aparecer en algún campo, en cualquier orden:
// "vega mariella" encuentra a "MARIELLA_LO_VEGA". Búsqueda vacía = todo coincide.
// ponytail: el banco trunca el nombre a 20 caracteres, así que una palabra
// escrita completa ("agropecuaria") no encuentra "AGROPE"; se escribe corta.
export function coincideBusqueda(busqueda: string, campos: (string | null)[]): boolean {
  const palabras = normalizar(busqueda).trim().split(" ").filter(Boolean);
  const texto = normalizar(campos.filter((campo) => campo !== null).join(" | "));

  return palabras.every((palabra) => texto.includes(palabra));
}
