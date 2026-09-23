// Mete avisos de banco de mentira en el buzón de pruebas, para poder correr
// `correo-poll` de punta a punta sin tocar el correo real del negocio.
//
//   docker run -d --name greenmail -p 3025:3025 -p 3993:3993 \
//     -e GREENMAIL_OPTS='-Dgreenmail.setup.test.smtp -Dgreenmail.setup.test.imaps \
//        -Dgreenmail.hostname=0.0.0.0 -Dgreenmail.users=info:clave-local@organicocr.store' \
//     greenmail/standalone:2.1.0
//   node scripts/sembrar-greenmail.mjs
import { connect } from "node:net";

const HOST = "127.0.0.1";
const PUERTO = 3025;
const BUZON = "info@organicocr.store";
const FIN_DE_LINEA = "\r\n";

const AVISOS = [
  {
    de: "Davibank <servicioalcliente@davibank.cr>",
    id: "<davibank-plano-1@davibank.cr>",
    asunto: "=?UTF-8?B?QXZpc28gZGUgU0lOUEUgTcOzdmls?=",
    tipo: "text/plain; charset=UTF-8",
    codificacion: "quoted-printable",
    cuerpo:
      "Davibank le informa ha recibido 12.036,00 colones de ANA MARIA SOLANO=\r\n JEREZ al SINPE M=C3=B3vil",
  },
  {
    de: "Davibank <servicioalcliente@davibank.cr>",
    id: "<davibank-html-2@davibank.cr>",
    asunto: "Aviso de SINPE Movil",
    tipo: "text/html; charset=UTF-8",
    codificacion: "base64",
    cuerpo: Buffer.from(
      "<html><body><p>Davibank le informa ha recibido <b>8614</b>&nbsp;colones " +
        "de <span>MARIELLA LO</span> al SINPE M&oacute;vil</p></body></html>",
      "utf8",
    ).toString("base64"),
  },
  // Formato desconocido a propósito (D5): tiene que quedar capturado y sin
  // extraer, no perderse ni tumbar la corrida.
  {
    de: "BAC Credomatic <notificacion@baccredomatic.com>",
    id: "<bac-desconocido-3@baccredomatic.com>",
    asunto: "Comprobante de transferencia",
    tipo: "text/plain; charset=UTF-8",
    codificacion: "7bit",
    cuerpo: "Usted ha recibido una transferencia por 13195 CRC de NADAV CHUDLER.",
  },
];

function mensaje(aviso) {
  return [
    `Message-ID: ${aviso.id}`,
    `From: ${aviso.de}`,
    `To: ${BUZON}`,
    `Subject: ${aviso.asunto}`,
    `Date: ${new Date().toUTCString()}`,
    "MIME-Version: 1.0",
    `Content-Type: ${aviso.tipo}`,
    `Content-Transfer-Encoding: ${aviso.codificacion}`,
    "",
    aviso.cuerpo,
  ].join(FIN_DE_LINEA);
}

function crearCliente(socket) {
  let buffer = "";
  let pendiente = null;

  socket.setEncoding("utf8");
  socket.on("data", (trozo) => {
    buffer += trozo;
    if (!pendiente) return;

    // Una respuesta SMTP puede venir en varias líneas; la última lleva un
    // espacio después del código en vez de un guion.
    const fin = /^(\d{3}) [^\n]*\r\n$/m.exec(buffer.slice(-buffer.length));
    if (!fin || !buffer.endsWith(FIN_DE_LINEA)) return;

    const { resolver, rechazar } = pendiente;
    const respuesta = buffer.trim();
    buffer = "";
    pendiente = null;

    if (respuesta.split(FIN_DE_LINEA).at(-1).startsWith("5")) rechazar(new Error(respuesta));
    else resolver(respuesta);
  });

  return (orden) =>
    new Promise((resolver, rechazar) => {
      pendiente = { resolver, rechazar };
      if (orden !== null) socket.write(orden + FIN_DE_LINEA);
    });
}

// Una línea que empieza con punto termina el DATA antes de tiempo.
function escaparPuntos(texto) {
  return texto.replace(/^\./gm, "..");
}

async function main() {
  const socket = connect({ host: HOST, port: PUERTO });
  await new Promise((listo) => socket.once("connect", listo));
  const ordenar = crearCliente(socket);

  await ordenar(null);
  await ordenar("EHLO sembrador");

  for (const aviso of AVISOS) {
    const direccion = /<([^>]+)>/.exec(aviso.de)?.[1] ?? aviso.de;
    await ordenar(`MAIL FROM:<${direccion}>`);
    await ordenar(`RCPT TO:<${BUZON}>`);
    await ordenar("DATA");
    await ordenar(`${escaparPuntos(mensaje(aviso))}${FIN_DE_LINEA}.`);
    console.log(`enviado: ${aviso.id}`);
  }

  await ordenar("QUIT");
  socket.destroy();
  console.log(`\n${AVISOS.length} avisos en ${BUZON}.`);
}

main().catch((error) => {
  console.error(`\nFallo: ${error.message}`);
  process.exit(1);
});
