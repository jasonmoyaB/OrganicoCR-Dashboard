// Sirve desde /public, no import: así no entra al JS que bloquea el primer
// render. El service worker lo guarda en el cascarón (`sw-cache.js`).
const RUTA_LOGO = "/logo-agroambientales.jpeg";

interface Props {
  className: string;
}

export function LogoOrganico({ className }: Props) {
  return (
    <img
      src={RUTA_LOGO}
      alt="Consultores Agroambientales S.A."
      width={500}
      height={500}
      // width/height reales para que el navegador reserve el espacio y la
      // tarjeta del login no salte cuando termina de cargar la imagen.
      className={`w-auto select-none rounded-md ${className}`}
      draggable={false}
    />
  );
}
