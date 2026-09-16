import { base64urlABytes } from "@/utils/base64url-a-bytes";

const LLAVE_PUBLICA = import.meta.env.VITE_VAPID_PUBLIC_KEY;

// Las cuatro condiciones se piden juntas porque fallan juntas: un iPhone sin la
// app instalada trae `Notification` pero no `PushManager`, y un deploy sin la
// llave VAPID configurada tiene todo el soporte del mundo y no puede suscribir
// a nadie. Si falta cualquiera, el aviso de activar no se muestra: pedirle
// permiso a alguien para algo que no va a funcionar es peor que no pedírselo.
export function puedeRecibirPush(): boolean {
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    Boolean(LLAVE_PUBLICA)
  );
}

// `getRegistration` y no `ready`: `ready` nunca resuelve si no hay worker
// instalado —el caso de `pnpm dev`— y dejaría el aviso colgado en "cargando"
// para siempre.
async function registroDelWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;

  const registro = await navigator.serviceWorker.getRegistration();
  if (!registro) return null;

  return navigator.serviceWorker.ready;
}

export async function hayServiceWorker(): Promise<boolean> {
  return (await registroDelWorker()) !== null;
}

export async function suscripcionActual(): Promise<PushSubscription | null> {
  const registro = await registroDelWorker();

  return (await registro?.pushManager.getSubscription()) ?? null;
}

export async function crearSuscripcion(): Promise<PushSubscription> {
  const registro = await registroDelWorker();
  if (!registro) throw new Error("El service worker todavía no está instalado");

  return registro.pushManager.subscribe({
    // Obligatorio en Chrome, y es una promesa que el worker cumple: cada push
    // termina en una notificación visible.
    userVisibleOnly: true,
    applicationServerKey: base64urlABytes(LLAVE_PUBLICA),
  });
}
