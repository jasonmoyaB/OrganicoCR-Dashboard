export const RANGO = {
  HOY: "hoy",
  AYER: "ayer",
  SIETE_DIAS: "7dias",
  ESTE_MES: "mes",
  TODO: "todo",
  PERSONALIZADO: "personalizado",
} as const;

export type Rango = (typeof RANGO)[keyof typeof RANGO];

// El personalizado no está acá: no se elige de la lista, se activa solo cuando
// alguien escribe una fecha en los campos.
export const RANGOS_RAPIDOS = [RANGO.HOY, RANGO.AYER, RANGO.SIETE_DIAS, RANGO.ESTE_MES, RANGO.TODO];

export const ETIQUETAS_RANGO: Record<Rango, string> = {
  [RANGO.HOY]: "Hoy",
  [RANGO.AYER]: "Ayer",
  [RANGO.SIETE_DIAS]: "Últimos 7 días",
  [RANGO.ESTE_MES]: "Este mes",
  [RANGO.TODO]: "Todo",
  [RANGO.PERSONALIZADO]: "Personalizado",
};
