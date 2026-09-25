// Qué se guarda para que la app abra sin señal, y qué nunca.
//
// Nada de Supabase se cachea. Este dashboard dice quién debe plata: mostrar una
// respuesta vieja de la API como si fuera de ahora es peor que no abrir.

// Subir la versión al cambiar algo del cascarón: el worker nuevo borra la
// caché vieja al activarse y nadie se queda con el logo anterior.
const CACHE = "organicocr-v2";

// El cascarón: lo que hace falta para pintar la pantalla antes de que conteste
// la API. Si alguno de estos 404, `addAll` falla y el worker no se instala —lo
// cual es correcto: un cascarón a medias no sirve.
const CASCARA = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/Logo/logoagroambientales.jpeg",
  "/icons/icono-192.png",
  "/icons/icono-512.png",
];

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(CASCARA))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((nombres) => Promise.all(nombres.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

// Navegaciones: red primero. El HTML nombra los assets con hash, así que servir
// un index.html viejo desde la caché apuntaría a archivos que ya no existen.
// La copia guardada es solo el plan B de cuando no hay señal.
async function redPrimero(pedido) {
  try {
    const respuesta = await fetch(pedido);
    if (respuesta.ok) {
      const cache = await caches.open(CACHE);
      await cache.put("/index.html", respuesta.clone());
    }
    return respuesta;
  } catch {
    const guardada = await caches.match("/index.html");
    if (guardada) return guardada;
    throw new Error("Sin señal y sin copia del dashboard");
  }
}

// Los archivos de /assets llevan hash en el nombre: el contenido de una URL
// dada no cambia nunca, así que la caché siempre tiene la razón.
async function cachePrimero(pedido) {
  const guardada = await caches.match(pedido);
  if (guardada) return guardada;

  const respuesta = await fetch(pedido);
  if (respuesta.ok) {
    const cache = await caches.open(CACHE);
    await cache.put(pedido, respuesta.clone());
  }
  return respuesta;
}

function esDelBuild(pedido) {
  const url = new URL(pedido.url);
  return url.origin === self.location.origin && url.pathname.startsWith("/assets/");
}

self.addEventListener("fetch", (evento) => {
  const pedido = evento.request;
  if (pedido.method !== "GET") return;

  if (pedido.mode === "navigate") {
    evento.respondWith(redPrimero(pedido));
    return;
  }

  if (esDelBuild(pedido)) {
    evento.respondWith(cachePrimero(pedido));
  }

  // Todo lo demás —Supabase, las fuentes de Google— sale a la red sin pasar
  // por acá.
});
