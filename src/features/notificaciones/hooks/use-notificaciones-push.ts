import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { guardarSuscripcion } from "../services/push-service";
import {
  crearSuscripcion,
  hayServiceWorker,
  puedeRecibirPush,
  suscripcionActual,
} from "../services/suscripcion-navegador";

export type EstadoPush =
  | "cargando"
  | "no-disponible"
  | "puede-activar"
  | "activando"
  | "activas"
  | "bloqueadas"
  | "descartado";

const CLAVE_DESCARTADO = "organicocr:notificaciones-descartadas";

async function reponerFila(suscripcion: PushSubscription): Promise<void> {
  try {
    await guardarSuscripcion(supabase, suscripcion);
  } catch {
    // El navegador ya está suscrito; lo que falló es nuestra fila. Decirle al
    // dueño que "no se pudieron activar" sería mentira, y el próximo arranque
    // vuelve a intentarlo.
  }
}

async function estadoReal(): Promise<EstadoPush> {
  if (!puedeRecibirPush() || !(await hayServiceWorker())) return "no-disponible";
  if (Notification.permission === "denied") return "bloqueadas";

  const suscripcion = await suscripcionActual();
  if (suscripcion) {
    // El navegador se acuerda de la suscripción aunque la fila se haya perdido
    // —un `db reset` la borra—. Sin reponerla, el permiso figura dado y no
    // llega un solo aviso.
    await reponerFila(suscripcion);
    return "activas";
  }

  return localStorage.getItem(CLAVE_DESCARTADO) ? "descartado" : "puede-activar";
}

export function useNotificacionesPush() {
  const [estado, setEstado] = useState<EstadoPush>("cargando");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let montado = true;

    estadoReal()
      .then((siguiente) => montado && setEstado(siguiente))
      .catch(() => montado && setEstado("no-disponible"));

    return () => {
      montado = false;
    };
  }, []);

  const activar = useCallback(async () => {
    setError(null);
    setEstado("activando");

    // El permiso se pide acá y no al cargar la app: un navegador que recibe el
    // pedido sin que nadie lo haya tocado lo bloquea de por vida, y ese "no"
    // no se puede deshacer desde la página.
    const permiso = await Notification.requestPermission();
    if (permiso !== "granted") {
      setEstado(permiso === "denied" ? "bloqueadas" : "puede-activar");
      return;
    }

    try {
      await guardarSuscripcion(supabase, await crearSuscripcion());
      setEstado("activas");
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : "No se pudieron activar");
      setEstado("puede-activar");
    }
  }, []);

  const descartar = useCallback(() => {
    localStorage.setItem(CLAVE_DESCARTADO, "1");
    setEstado("descartado");
  }, []);

  return { estado, error, activar, descartar };
}
