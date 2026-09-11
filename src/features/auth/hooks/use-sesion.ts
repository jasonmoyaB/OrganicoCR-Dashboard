import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export function useSesion() {
  const [sesion, setSesion] = useState<Session | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSesion(data.session);
      setCargando(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_evento, sesionNueva) =>
      setSesion(sesionNueva),
    );

    return () => data.subscription.unsubscribe();
  }, []);

  return { sesion, cargando };
}
