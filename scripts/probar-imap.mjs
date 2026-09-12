// Comprueba que la credencial de CORREO_IMAP_* abre el buzón, y nada más.
// No imprime la contraseña ni el contenido de ningún correo: solo dice si el
// login pasó, cuántos avisos del banco hay y el UID más alto.
//
//   pnpm imap:probar
import { connect } from "node:tls";

const TIMEOUT_MS = 15_000;
const NUL = String.fromCharCode(0);

function leerEnv(clave) {
  const valor = process.env[clave];
  if (!valor) throw new Error(`Falta la variable de entorno ${clave}`);
  return valor;
}

// IMAP responde en líneas y una orden termina cuando aparece su etiqueta al
// principio de una. Se acumula hasta verla en vez de leer un solo chunk: una
// respuesta larga llega partida en varios paquetes.
function crearCliente(socket) {
  let buffer = "";
  let pendiente = null;
  let contador = 0;

  socket.setEncoding("utf8");
  socket.on("data", (trozo) => {
    buffer += trozo;
    if (!pendiente) return;

    const fin = new RegExp(`^${pendiente.etiqueta} (OK|NO|BAD)(.*)$`, "m").exec(buffer);
    if (!fin) return;

    const { resolver, rechazar } = pendiente;
    const respuesta = buffer;
    buffer = "";
    pendiente = null;

    if (fin[1] === "OK") resolver(respuesta);
    else rechazar(new Error(`${fin[1]} ${fin[2].trim()}`));
  });

  return (orden) => {
    const etiqueta = `a${++contador}`;
    buffer = "";
    return new Promise((resolver, rechazar) => {
      pendiente = { etiqueta, resolver, rechazar };
      socket.write(`${etiqueta} ${orden}\r\n`);
    });
  };
}

function conectar(host, puerto) {
  return new Promise((resolver, rechazar) => {
    const socket = connect({ host, port: Number(puerto), servername: host }, () =>
      resolver(socket),
    );
    socket.setTimeout(TIMEOUT_MS, () => rechazar(new Error("Timeout al conectar")));
    socket.on("error", rechazar);
  });
}

// AUTHENTICATE PLAIN en vez de LOGIN: el payload va en base64, así que una
// contraseña con comillas, espacios o backslashes no necesita escaparse. El
// servidor anuncia AUTH=PLAIN y SASL-IR, o sea que acepta la respuesta
// inicial en la misma línea.
function ordenAutenticar(usuario, clave) {
  const token = Buffer.from(`${NUL}${usuario}${NUL}${clave}`, "utf8").toString("base64");
  return `AUTHENTICATE PLAIN ${token}`;
}

function uidsDe(respuesta) {
  const encontrados = /^\* SEARCH([\d ]*)$/m.exec(respuesta);
  return (encontrados?.[1] ?? "").trim().split(/\s+/).filter(Boolean).map(Number);
}

async function main() {
  const host = leerEnv("CORREO_IMAP_HOST");
  const usuario = leerEnv("CORREO_IMAP_USUARIO");
  console.log(`Conectando a ${host} como ${usuario}...`);

  const socket = await conectar(host, leerEnv("CORREO_IMAP_PUERTO"));
  const ordenar = crearCliente(socket);

  try {
    await ordenar(ordenAutenticar(usuario, leerEnv("CORREO_IMAP_CLAVE")));
    console.log("AUTHENTICATE: ok");

    // EXAMINE y no SELECT: abre el buzón en solo lectura. Este script no
    // puede marcar ni borrar nada del correo del negocio.
    const buzon = await ordenar("EXAMINE INBOX");
    const total = /^\* (\d+) EXISTS$/m.exec(buzon);
    const validez = /UIDVALIDITY (\d+)/.exec(buzon);
    console.log(`INBOX: ${total?.[1] ?? "?"} mensajes - uidvalidity ${validez?.[1] ?? "?"}`);

    for (const aguja of ["davibank", "bac"]) {
      const uids = uidsDe(await ordenar(`UID SEARCH FROM "${aguja}"`));
      const ultimo = uids.length > 0 ? Math.max(...uids) : "-";
      console.log(`FROM *${aguja}*: ${uids.length} correos - uid mas alto ${ultimo}`);
    }

    await ordenar("LOGOUT");
    console.log("\nCredencial correcta.");
  } finally {
    socket.destroy();
  }
}

main().catch((error) => {
  console.error(`\nFallo: ${error.message}`);
  process.exit(1);
});
