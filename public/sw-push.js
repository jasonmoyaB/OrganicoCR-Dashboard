// Las notificaciones de pago. El navegador despierta este worker con la app
// cerrada, así que acá no hay React ni sesión: solo el payload que mandó
// `enviar-push` y lo que se pueda dibujar con él.

const ICONO = "/icons/icono-192.png";
const DESTINO_POR_DEFECTO = "/?seccion=pagos";

const AVISO_GENERICO = {
  titulo: "Entró un pago",
  cuerpo: "Abrí el dashboard para verlo.",
  tag: "pago",
  url: DESTINO_POR_DEFECTO,
};

// `userVisibleOnly: true` es una promesa: cada push tiene que terminar en una
// notificación visible. Si el payload viene roto igual hay que mostrar algo, o
// el navegador castiga la suscripción y deja de entregar.
function leerAviso(datos) {
  if (!datos) return AVISO_GENERICO;

  try {
    const payload = datos.json();
    return {
      titulo: payload.titulo ?? AVISO_GENERICO.titulo,
      cuerpo: payload.cuerpo ?? AVISO_GENERICO.cuerpo,
      tag: payload.tag ?? AVISO_GENERICO.tag,
      url: payload.url ?? DESTINO_POR_DEFECTO,
    };
  } catch {
    return AVISO_GENERICO;
  }
}

self.addEventListener("push", (evento) => {
  const aviso = leerAviso(evento.data);

  evento.waitUntil(
    self.registration.showNotification(aviso.titulo, {
      body: aviso.cuerpo,
      icon: ICONO,
      lang: "es-CR",
      // Un tag por pago. Con un tag fijo, dos pagos seguidos se pisan y el
      // segundo reemplaza al primero en la bandeja: plata que entró y nadie vio.
      tag: aviso.tag,
      data: { url: aviso.url },
    }),
  );
});

// Si el dashboard ya está abierto se reusa esa ventana. Abrir una segunda deja
// dos copias de la misma app peleándose la sesión.
async function abrirDashboard(destino) {
  const ventanas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  const abierta = ventanas[0];

  if (!abierta) {
    await self.clients.openWindow(destino);
    return;
  }

  await abierta.focus();
  // `navigate` no existe en todos los navegadores y falla si la ventana no está
  // controlada por este worker. Que no se pueda mover no justifica no abrirla.
  try {
    await abierta.navigate(destino);
  } catch {
    /* queda en la sección donde estaba */
  }
}

self.addEventListener("notificationclick", (evento) => {
  evento.notification.close();
  evento.waitUntil(abrirDashboard(evento.notification.data?.url ?? DESTINO_POR_DEFECTO));
});
