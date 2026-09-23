// Quién puede disparar una Edge Function que solo la base debería disparar.
//
// `verify_jwt` no alcanza: acepta cualquier JWT del proyecto, y la publishable
// key es uno de ellos —viaja en el bundle que descarga el navegador—. Sin este
// chequeo, cualquiera que abra el dashboard puede invocar la función cuando se
// le antoje.
//
// Se mira el claim `role` y NO se compara contra SUPABASE_SERVICE_ROLE_KEY: en
// producción, lo que el runtime inyecta ahí no es el mismo string que el trigger
// saca de Vault —depende del esquema de claves del proyecto, que cambió con las
// publishable/secret—, así que la función terminaba devolviéndole 401 a su
// propia base. Verificado contra la nube el 2026-09-15.
//
// **Esto depende de que `verify_jwt` siga activo.** El gateway es quien verifica
// la firma; acá solo se lee el payload, que sin esa verificación previa lo
// falsifica cualquiera. Por eso `supabase/config.toml` lo deja escrito en vez de
// confiar en el default.

const ROL_DE_LA_BASE = "service_role";

export function rolDelToken(pedido: Request): string | null {
  const token = pedido.headers.get("Authorization")?.replace(/^Bearer /, "");
  const payload = token?.split(".")[1];
  if (!payload) return null;

  try {
    // base64url sin relleno: `atob` lo exige, y el payload de un JWT casi nunca
    // viene en múltiplo de 4.
    const relleno = "=".repeat((4 - (payload.length % 4)) % 4);
    const json = atob(payload.replaceAll("-", "+").replaceAll("_", "/") + relleno);
    return (JSON.parse(json) as { role?: string }).role ?? null;
  } catch {
    return null;
  }
}

export function vieneDeLaBase(pedido: Request): boolean {
  return rolDelToken(pedido) === ROL_DE_LA_BASE;
}
