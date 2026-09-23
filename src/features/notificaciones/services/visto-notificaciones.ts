import type { NotificacionPago } from "../types/notificacion.types";

const CLAVE_VISTO = "organicocr:pagos-vistos-hasta";

// Hasta qué instante el dueño ya miró la campana. La primera vez que se abre
// el dashboard se planta el ahora: el buzón tiene casi dos mil avisos viejos
// del banco y estrenar la campana con "20 sin ver" de cosas de hace meses la
// vuelve ruido desde el primer día.
export function marcaDeVisto(): string {
  const guardada = localStorage.getItem(CLAVE_VISTO);
  if (guardada) return guardada;

  const ahora = new Date().toISOString();
  localStorage.setItem(CLAVE_VISTO, ahora);

  return ahora;
}

export function guardarVisto(marca: string): void {
  localStorage.setItem(CLAVE_VISTO, marca);
}

// Se compara por instante y no por string: PostgREST devuelve `+00:00` y
// `toISOString()` devuelve `Z`. Son el mismo momento y ordenan distinto en
// orden alfabético, así que comparar los textos marca como nuevo lo ya visto.
export function sinVer(
  notificaciones: NotificacionPago[],
  marca: string,
): NotificacionPago[] {
  const limite = Date.parse(marca);

  return notificaciones.filter((aviso) => Date.parse(aviso.creadoEn) > limite);
}

// La marca nueva es la llegada del aviso más reciente, no el reloj del
// navegador: entre la consulta y el clic pueden entrar pagos que la pantalla
// todavía no muestra, y plantar el ahora los daría por vistos sin haberlos visto.
export function marcaTrasLimpiar(notificaciones: NotificacionPago[], actual: string): string {
  const instantes = notificaciones.map((aviso) => Date.parse(aviso.creadoEn));

  return instantes.length > 0 ? new Date(Math.max(...instantes)).toISOString() : actual;
}
