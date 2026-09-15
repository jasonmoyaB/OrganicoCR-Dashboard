// Cliente de Supabase de mentira, con lo justo que usan `procesar-correo` y
// `reprocesar-huerfanos`. Existe para poder probar el manejo de errores sin
// levantar Postgres: lo que importa de estos módulos es qué hacen cuando la
// escritura falla, y eso contra una base real es difícil de provocar a pedido.

// deno-lint-ignore-file no-explicit-any

export interface Escritura {
  tabla: string;
  campos: Record<string, unknown>;
}

interface Guion {
  // Error que devuelve el `update` sobre correos_banco, si se quiere provocar.
  errorAlMarcar?: string;
  errorAlGuardarPago?: string;
  // Filas que devuelve el select de huérfanos.
  huerfanos?: Record<string, unknown>[];
}

export function supabaseFalso(guion: Guion = {}) {
  const escrituras: Escritura[] = [];

  const consulta = (tabla: string) => ({
    update(campos: Record<string, unknown>) {
      escrituras.push({ tabla, campos });
      const error = guion.errorAlMarcar ? { message: guion.errorAlMarcar } : null;
      return { eq: () => Promise.resolve({ error }) };
    },
    upsert(campos: Record<string, unknown>) {
      escrituras.push({ tabla, campos });
      return Promise.resolve({
        error: guion.errorAlGuardarPago ? { message: guion.errorAlGuardarPago } : null,
      });
    },
    select() {
      const resultado = { data: guion.huerfanos ?? [], error: null };
      const encadenable: any = {
        is: () => encadenable,
        order: () => encadenable,
        limit: () => Promise.resolve(resultado),
      };
      return encadenable;
    },
  });

  return {
    cliente: { from: consulta } as any,
    escrituras,
  };
}
