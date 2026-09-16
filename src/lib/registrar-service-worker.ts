const RUTA_WORKER = "/sw.js";

// Solo en el build de producción. En `pnpm dev` Vite sirve cada módulo por
// separado y un worker que cachea deja al navegador mostrando código viejo
// después de cada edición. Para probar el PWA en la máquina:
//
//   pnpm build && pnpm preview
//
// Ese `preview` corre sobre localhost, que cuenta como contexto seguro: el
// service worker se instala, la app se puede instalar y el push funciona igual
// que en Vercel.
export function registrarServiceWorker(): void {
  if (!import.meta.env.PROD) return;
  if (!("serviceWorker" in navigator)) return;

  navigator.serviceWorker
    // `updateViaCache: "none"` y no el default: con el default, el navegador
    // puede servir sw-push.js desde su caché HTTP y un deploy nuevo quedaría
    // corriendo el worker viejo.
    .register(RUTA_WORKER, { updateViaCache: "none" })
    .catch((error: unknown) => {
      console.error("No se pudo registrar el service worker", error);
    });
}
