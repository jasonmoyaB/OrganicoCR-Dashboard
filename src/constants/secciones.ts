export const SECCION = {
  DEBEN: "deben",
  PAGOS: "pagos",
} as const;

export type Seccion = (typeof SECCION)[keyof typeof SECCION];

export const ETIQUETAS_SECCION: Record<Seccion, string> = {
  [SECCION.DEBEN]: "Deben",
  [SECCION.PAGOS]: "Pagos",
};
