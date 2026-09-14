// Lectura y escritura de lo que el poll guarda en la tabla `config`.
//
// El cursor y la lista de remitentes viven ahí y no como constantes: sumar el
// BAC o releer el buzón desde cero se hace cambiando una fila, sin redeploy.

import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

export interface Cursor {
  // Null la primera vez. Si el servidor devuelve otro, renumeró el buzón y
  // los UID guardados ya no significan nada.
  uidvalidity: number | null;
  ultimoUid: number;
}

export interface ConfigCorreo {
  cursor: Cursor;
  remitentes: string[];
}

const CLAVE_CURSOR = "correo_cursor";
const CLAVE_REMITENTES = "remitentes_banco";
const CURSOR_INICIAL: Cursor = { uidvalidity: null, ultimoUid: 0 };

function aCursor(valor: unknown): Cursor {
  if (typeof valor !== "object" || valor === null) return CURSOR_INICIAL;

  const crudo = valor as Record<string, unknown>;
  const uidvalidity = crudo.uidvalidity;
  const ultimoUid = crudo.ultimo_uid;

  return {
    uidvalidity: typeof uidvalidity === "number" ? uidvalidity : null,
    ultimoUid: typeof ultimoUid === "number" ? ultimoUid : 0,
  };
}

// Una lista vacía haría que el poll corra cada 5 minutos sin mirar nada y sin
// que nadie lo note. Mejor que reviente y quede en los logs.
function aRemitentes(valor: unknown): string[] {
  const lista = Array.isArray(valor) ? valor.filter((x) => typeof x === "string") : [];
  if (lista.length === 0) {
    throw new Error(`config.${CLAVE_REMITENTES} está vacía: el poll no sabría qué buscar`);
  }
  return lista;
}

export async function leerConfigCorreo(supabase: SupabaseClient): Promise<ConfigCorreo> {
  const { data, error } = await supabase
    .from("config")
    .select("clave, valor")
    .in("clave", [CLAVE_CURSOR, CLAVE_REMITENTES]);

  if (error) throw new Error(`No se pudo leer la config del correo: ${error.message}`);

  const valores = new Map((data ?? []).map((fila) => [fila.clave, fila.valor]));

  return {
    cursor: aCursor(valores.get(CLAVE_CURSOR)),
    remitentes: aRemitentes(valores.get(CLAVE_REMITENTES)),
  };
}

export async function guardarCursor(supabase: SupabaseClient, cursor: Cursor): Promise<void> {
  const { error } = await supabase
    .from("config")
    .update({ valor: { uidvalidity: cursor.uidvalidity, ultimo_uid: cursor.ultimoUid } })
    .eq("clave", CLAVE_CURSOR);

  if (error) throw new Error(`No se pudo guardar el cursor del correo: ${error.message}`);
}
