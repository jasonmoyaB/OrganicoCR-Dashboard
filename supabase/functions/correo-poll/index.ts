import { createClient } from "jsr:@supabase/supabase-js@2";
import { capturarCorreo, type ResultadoCaptura } from "./capturar-correo.ts";
import { abrirBuzon, type ClienteImap, type CredencialImap } from "./cliente-imap.ts";
import { guardarCursor, leerConfigCorreo } from "./config-correo.ts";
import { parsearCorreo } from "./mensaje-rfc822.ts";
import { cuerpoDeFetch, uidsDe, uidvalidityDe } from "./respuestas-imap.ts";

// Cuántos correos se traen por corrida. El buzón real tiene 13 000 mensajes y
// más de 1 700 avisos del banco, así que la primera corrida con el cursor en
// cero intentaría bajarlos todos, se pasaría del timeout del cron y —como el
// cursor solo se guarda si nada falla— reintentaría lo mismo cada 5 minutos sin
// avanzar nunca. Con el lote acotado, cada corrida progresa y el histórico se
// pone al día solo, tanda por tanda.
const LOTE_MAXIMO = 50;

function leerEnv(clave: string): string {
  const valor = Deno.env.get(clave);
  if (!valor) throw new Error(`Falta la variable de entorno ${clave}`);
  return valor;
}

// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY las inyecta el runtime: el prefijo
// SUPABASE_ está reservado y no se puede declarar como secreto propio.
const supabase = createClient(
  leerEnv("SUPABASE_URL"),
  leerEnv("SUPABASE_SERVICE_ROLE_KEY"),
);

function credencial(): CredencialImap {
  const certificado = Deno.env.get("CORREO_IMAP_CA_PEM");

  return {
    host: leerEnv("CORREO_IMAP_HOST"),
    puerto: Number(leerEnv("CORREO_IMAP_PUERTO")),
    usuario: leerEnv("CORREO_IMAP_USUARIO"),
    clave: leerEnv("CORREO_IMAP_CLAVE"),
    certificados: certificado ? [certificado] : undefined,
  };
}

async function uidsNuevos(
  buzon: ClienteImap,
  remitentes: string[],
  desde: number,
): Promise<number[]> {
  const encontrados = new Set<number>();

  for (const remitente of remitentes) {
    // `n:*` puede devolver el UID más alto aunque sea menor que n, así que el
    // filtro de abajo es el que manda, no el servidor.
    const respuesta = await buzon.texto(`UID SEARCH FROM "${remitente}" UID ${desde + 1}:*`);
    for (const uid of uidsDe(respuesta)) {
      if (uid > desde) encontrados.add(uid);
    }
  }

  return [...encontrados].sort((uno, otro) => uno - otro);
}

async function traerCorreo(buzon: ClienteImap, uid: number, uidvalidity: number) {
  // BODY.PEEK y no BODY: `BODY[]` marca el mensaje como leído. El buzón se
  // abre con EXAMINE, que ya lo impide, pero dejarlo explícito evita que
  // alguien lo rompa cambiando EXAMINE por SELECT sin darse cuenta.
  const respuesta = await buzon.ordenar(`UID FETCH ${uid} BODY.PEEK[]`);
  const correo = parsearCorreo(cuerpoDeFetch(respuesta));

  return {
    ...correo,
    uid,
    // Un correo sin Message-ID es legal. La clave de idempotencia se arma con
    // el UID y la generación del buzón, que juntos no se repiten.
    mensajeId: correo.mensajeId ?? `imap-${uidvalidity}-${uid}`,
  };
}

async function pollear() {
  const { cursor, remitentes } = await leerConfigCorreo(supabase);
  const buzon = await abrirBuzon(credencial());

  try {
    // EXAMINE y no SELECT: solo lectura. El servidor rechaza marcar y borrar,
    // que es lo que hace aceptable usar el buzón del negocio (R2).
    const uidvalidity = uidvalidityDe(await buzon.texto("EXAMINE INBOX"));

    // Si el buzón renumeró, los UID guardados no significan nada. Releer todo
    // es barato: `mensaje_id` es único y los repetidos caen solos.
    const desde = cursor.uidvalidity === uidvalidity ? cursor.ultimoUid : 0;
    // Ordenados de menor a mayor, así que recortar por el principio deja el
    // cursor en un punto del que la próxima corrida puede seguir sin huecos.
    const uids = (await uidsNuevos(buzon, remitentes, desde)).slice(0, LOTE_MAXIMO);

    const conteo: Record<ResultadoCaptura, number> = {
      extraido: 0,
      "sin-extraer": 0,
      "ya-estaba": 0,
    };

    for (const uid of uids) {
      conteo[await capturarCorreo(supabase, await traerCorreo(buzon, uid, uidvalidity))] += 1;
    }

    await buzon.texto("LOGOUT");

    // El cursor se guarda al final y solo si nada falló. Si algo revienta a
    // mitad, la próxima corrida relee desde el mismo punto: repetir es gratis,
    // saltarse un pago no.
    if (uids.length > 0) {
      await guardarCursor(supabase, { uidvalidity, ultimoUid: uids[uids.length - 1] });
    }

    return { revisados: uids.length, ...conteo };
  } finally {
    buzon.cerrar();
  }
}

Deno.serve(async () => {
  try {
    return Response.json(await pollear());
  } catch (error) {
    const motivo = (error as Error).message;
    console.error("correo-poll falló:", motivo);

    // 500 para que quede en cron.job_run_details como corrida fallida y no
    // pase por exitosa en silencio.
    return Response.json({ error: motivo }, { status: 500 });
  }
});
