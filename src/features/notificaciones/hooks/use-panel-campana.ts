import { useCallback, useEffect, useRef, useState } from "react";

// Abrir y cerrar el desplegable. Vive fuera del componente porque son tres
// cosas que no se ven —el clic afuera, la tecla Escape y la limpieza de los
// dos oyentes— y el botón solo tiene que saber si está abierto.
export function usePanelCampana() {
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);

  const cerrar = useCallback(() => setAbierto(false), []);
  const alternar = useCallback(() => setAbierto((previo) => !previo), []);

  useEffect(() => {
    if (!abierto) return;

    // `pointerdown` y no `click`: con `click` el desplegable se cierra recién
    // al soltar, y arrastrar desde adentro hacia afuera lo dejaba abierto.
    const alApuntar = (evento: PointerEvent) => {
      if (!contenedor.current?.contains(evento.target as Node)) cerrar();
    };

    const alTeclear = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") cerrar();
    };

    document.addEventListener("pointerdown", alApuntar);
    document.addEventListener("keydown", alTeclear);
    // En móvil el panel es `fixed` y la cabecera no: al desplazar la página, la
    // campana se va y el panel se queda flotando sobre el contenido, colgando
    // de nada. El `scroll` de la lista de adentro no llega acá —no burbujea—,
    // así que esto solo se dispara cuando se mueve la página entera.
    window.addEventListener("scroll", cerrar, { passive: true });

    return () => {
      document.removeEventListener("pointerdown", alApuntar);
      document.removeEventListener("keydown", alTeclear);
      window.removeEventListener("scroll", cerrar);
    };
  }, [abierto, cerrar]);

  return { abierto, alternar, cerrar, contenedor };
}
