// El texto que ve el dueño en la pantalla bloqueada. Función pura: se puede
// probar sin servicio de push, sin base y sin navegador.

export interface PagoParaAvisar {
  id: string;
  monto_centimos: number;
  remitente_nombre: string | null;
  referencia_detalle: string | null;
}

export interface AvisoPush {
  titulo: string;
  cuerpo: string;
  tag: string;
  url: string;
}

const SIN_DATOS = "Sin datos del remitente";
const CENTIMOS_POR_COLON = 100;
const DESTINO = "/?seccion=pagos";

// Copia deliberada de src/utils/format-colones.ts. Las Edge Functions se
// despliegan solas y el bundler no sigue imports fuera de supabase/functions:
// compartir el archivo no rompería acá, rompería en el deploy. Si cambia el
// formato de los montos, hay que tocar los dos.
const FORMATO = new Intl.NumberFormat("es-CR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function colones(centimos: number): string {
  return `₡${FORMATO.format(centimos / CENTIMOS_POR_COLON)}`;
}

// Davibank trunca el nombre a 20 caracteres y cambia los espacios por guiones
// bajos: "DISTRIBUIDORA_AGROPE". Se leen mejor con espacios, y el matcher ya
// compara por similitud, así que acá el nombre es solo para que lo lea una
// persona.
function partesDelCuerpo(pago: PagoParaAvisar): string[] {
  const nombre = pago.remitente_nombre?.replaceAll("_", " ").trim();
  // El BAC no dice quién mandó la plata —el único nombre del aviso es el del
  // titular—, así que ahí lo que identifica el pago es el concepto.
  const referencia = pago.referencia_detalle?.trim();

  return [nombre, referencia].filter((parte): parte is string => Boolean(parte));
}

export function mensajeDePago(pago: PagoParaAvisar): AvisoPush {
  const partes = partesDelCuerpo(pago);

  return {
    titulo: `Entró ${colones(pago.monto_centimos)}`,
    cuerpo: partes.length > 0 ? partes.join(" · ") : SIN_DATOS,
    // Un tag por pago. Con un tag fijo, dos pagos seguidos se pisan en la
    // bandeja y el segundo borra al primero: plata que entró y nadie vio.
    tag: `pago-${pago.id}`,
    url: DESTINO,
  };
}
