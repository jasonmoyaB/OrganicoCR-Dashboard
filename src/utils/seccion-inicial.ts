import { SECCION, type Seccion } from "@/constants/secciones";

const PARAMETRO = "seccion";

// Las únicas direcciones que existen. Vercel reescribe cualquier ruta a
// index.html, así que sin este chequeo `/lo-que-sea` abría Deben como si nada.
const RUTAS = ["/", "/index.html"];

function esSeccion(valor: string | null): valor is Seccion {
  return Object.values(SECCION).some((seccion) => seccion === valor);
}

// Sigue sin haber router y sigue sin hacer falta: nadie comparte enlaces de un
// dashboard de un solo usuario. Pero el atajo del icono instalado y el clic en
// una notificación tienen que poder decir "abrí en Pagos", y para eso alcanza
// con leer el parámetro una vez, al arrancar. Null = la dirección no existe:
// una ruta desconocida o una sección que no hay, y se muestra el 404 en vez de
// abrir Deben callado, que haría creer que la dirección anda.
export function seccionInicial(ruta: string, busqueda: string): Seccion | null {
  if (!RUTAS.includes(ruta)) return null;

  const valor = new URLSearchParams(busqueda).get(PARAMETRO);
  if (valor === null) return SECCION.DEBEN;

  return esSeccion(valor) ? valor : null;
}
