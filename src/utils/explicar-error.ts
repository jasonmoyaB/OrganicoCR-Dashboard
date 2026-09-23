// Traduce un error técnico a lo que el dueño necesita saber: qué pasó y si
// tiene que hacer algo. Los services ya le ponen contexto al mensaje ("No se
// pudieron cargar los pagos: …"); acá se reconoce la causa que va detrás.
//
// Una causa nueva es una fila más en CAUSAS: ni los componentes ni los
// services se enteran.

export interface ErrorExplicado {
  titulo: string;
  detalle: string;
  // El mensaje original, para pasárselo a quien lo arregle.
  tecnico: string;
  // Si es de las que prenden el aviso global de "la base no responde".
  deConexion: boolean;
}

interface Causa {
  patron: RegExp;
  titulo: string;
  detalle: string;
  deConexion?: boolean;
}

const CAUSAS: Causa[] = [
  {
    // Lo que tira `fetch` en Chrome, Firefox y Safari cuando no llega al servidor.
    patron: /failed to fetch|networkerror|load failed|network request failed/i,
    titulo: "Sin conexión con la base de datos",
    detalle:
      "No se pudo llegar al servidor. Si el internet anda, la base está caída: se reintenta sola.",
    deConexion: true,
  },
  {
    patron: /\b50[234]\b|bad gateway|service unavailable|upstream|timed? ?out/i,
    titulo: "La base de datos no responde",
    detalle: "Está caída o saturada. Se reintenta sola cada minuto.",
    deConexion: true,
  },
  {
    patron: /jwt expired|invalid jwt|refresh token/i,
    titulo: "La sesión venció",
    detalle: "Salí con el botón de arriba y volvé a entrar.",
  },
  {
    patron: /permission denied|row-level security/i,
    titulo: "La base rechazó la operación",
    detalle: "No hay permiso para hacer esto. Si se repite, avisale a Jason con el detalle técnico.",
  },
];

export function explicarError(error: unknown): ErrorExplicado {
  const tecnico = error instanceof Error ? error.message : String(error);
  const causa = CAUSAS.find(({ patron }) => patron.test(tecnico));

  if (!causa) {
    return { titulo: "Algo falló", detalle: tecnico, tecnico, deConexion: false };
  }

  return {
    titulo: causa.titulo,
    detalle: causa.detalle,
    tecnico,
    deConexion: causa.deConexion ?? false,
  };
}
