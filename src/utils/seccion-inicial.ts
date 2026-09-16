import { SECCION, type Seccion } from "@/constants/secciones";

const PARAMETRO = "seccion";

function esSeccion(valor: string | null): valor is Seccion {
  return Object.values(SECCION).some((seccion) => seccion === valor);
}

// Sigue sin haber router y sigue sin hacer falta: nadie comparte enlaces de un
// dashboard de un solo usuario. Pero el atajo del icono instalado y el clic en
// una notificación tienen que poder decir "abrí en Pagos", y para eso alcanza
// con leer el parámetro una vez, al arrancar. Un valor que no existe cae en
// Deben en vez de romper: la URL la puede escribir cualquiera.
export function seccionInicial(busqueda: string): Seccion {
  const valor = new URLSearchParams(busqueda).get(PARAMETRO);

  return esSeccion(valor) ? valor : SECCION.DEBEN;
}
