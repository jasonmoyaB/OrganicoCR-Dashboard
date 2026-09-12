// El header From llega en cualquiera de sus formas válidas:
//   servicioalcliente@davibank.cr
//   Davibank <servicioalcliente@davibank.cr>
//   "Davibank, S.A." <servicioalcliente@davibank.cr>
// Solo interesa la dirección, y en minúsculas: es la clave con la que se busca
// el extractor del banco.
const ENTRE_ANGULOS = /<([^>]+)>/;
const DIRECCION = /[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+/;

export function direccionRemitente(from: string): string {
  const enAngulos = ENTRE_ANGULOS.exec(from);
  const candidato = enAngulos ? enAngulos[1] : from;
  const direccion = DIRECCION.exec(candidato.trim());

  return direccion ? direccion[0].toLowerCase() : "";
}
