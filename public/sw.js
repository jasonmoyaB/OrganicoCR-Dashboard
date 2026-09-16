// Punto de entrada del service worker. No tiene lógica propia: el navegador
// exige un solo archivo registrado, y esta es la única forma de que la caché y
// las notificaciones vivan en archivos separados.
//
// Estos tres archivos van en /public y no en /src a propósito: un service
// worker se sirve tal cual desde la raíz del sitio. Pasarlos por el bundle les
// pondría un hash en el nombre, y el navegador identifica al worker por su URL
// —si la URL cambia en cada build, cada deploy instala un worker nuevo en vez
// de actualizar el que ya está. El precio es que oxlint y tsc no los miran.
importScripts("/sw-cache.js", "/sw-push.js");
