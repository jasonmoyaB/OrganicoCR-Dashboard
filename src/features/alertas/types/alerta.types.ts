// Un problema del lado del servidor, escrito por la función que lo sufrió
// (el buzón, el respaldo LLM, el push). El mensaje ya viene explicado para el
// dueño: el dashboard lo muestra tal cual.
export interface AlertaSistema {
  origen: string;
  mensaje: string;
  desde: string;
}
