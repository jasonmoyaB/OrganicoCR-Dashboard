export const METODO_EXTRACCION = {
  REGEX: "regex",
  LLM: "llm",
} as const;

export type MetodoExtraccion = (typeof METODO_EXTRACCION)[keyof typeof METODO_EXTRACCION];
