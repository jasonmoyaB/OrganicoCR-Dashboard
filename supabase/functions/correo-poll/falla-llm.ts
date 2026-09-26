// Qué fallas del respaldo LLM merecen avisarle al dueño. Solo las que no se
// arreglan solas: el respaldo se usa muy de vez en cuando, así que una alerta
// por una sobrecarga pasajera quedaría encendida semanas hasta la próxima
// llamada. Esas devuelven null y quedan solo en el log.

const RECARGAR = "Los avisos del banco que el lector normal no reconoce van a quedar sin leer.";

export function explicarFallaLlm(error: unknown): string | null {
  const { status, message = "" } = (error ?? {}) as { status?: number; message?: string };

  if (status === 400 && /credit balance/i.test(message)) {
    return `El respaldo con IA se quedó sin créditos en Anthropic. ${RECARGAR} Se arregla recargando saldo en console.anthropic.com.`;
  }
  if (status === 401 || status === 403) {
    return `Anthropic rechazó la clave del respaldo con IA (revocada o sin permisos). ${RECARGAR} Hay que generar una nueva y cargarla como ANTHROPIC_API_KEY.`;
  }

  return null;
}
