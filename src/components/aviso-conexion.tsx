import { useEstadoConexion } from "@/hooks/use-estado-conexion";

// Global y no por página: si la base se cae, el dueño tiene que saberlo esté
// en la sección que esté, y saber que lo que ve puede estar viejo.
export function AvisoConexion() {
  const { sinInternet, baseCaida } = useEstadoConexion();

  if (!sinInternet && !baseCaida) return null;

  return (
    <div role="alert" className="border-b border-alerta/20 bg-alerta-suave text-sm text-alerta">
      <p className="mx-auto max-w-6xl px-6 py-3 sm:px-8">
        <span className="font-semibold">
          {sinInternet ? "Sin internet." : "La base de datos no responde."}
        </span>{" "}
        Lo que ves es de la última vez que cargó.{" "}
        {sinInternet
          ? "Se actualiza sola cuando vuelva la conexión."
          : "Se reintenta sola cada minuto."}
      </p>
    </div>
  );
}
