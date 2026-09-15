import { useCorreosSinProcesar } from "../hooks/use-correos-sin-procesar";
import { CorreosSinProcesarAviso } from "./correos-sin-procesar-aviso";

// Contenedor mínimo. Existe para que el hook viva detrás del chequeo de sesión
// de App: montado más arriba consultaría el RPC también en la pantalla de
// login, donde `authenticated` todavía no existe y la llamada solo puede
// fallar.
export function CorreosSinProcesarBanner() {
  const { resumen } = useCorreosSinProcesar();

  return <CorreosSinProcesarAviso cantidad={resumen.cantidad} masViejo={resumen.masViejo} />;
}
