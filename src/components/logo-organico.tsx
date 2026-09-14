// Sirve desde /public, no import: es un PNG de 220 KB y meterlo al bundle lo
// mete también en el JS que bloquea el primer render.
const RUTA_LOGO = "/logo-organicocr.png";

interface Props {
  className: string;
}

export function LogoOrganico({ className }: Props) {
  return (
    <img
      src={RUTA_LOGO}
      alt="OrganicoCR"
      width={499}
      height={384}
      // width/height reales para que el navegador reserve el espacio y la
      // tarjeta del login no salte cuando termina de cargar la imagen.
      className={`logo-sin-fondo w-auto select-none ${className}`}
      draggable={false}
    />
  );
}
