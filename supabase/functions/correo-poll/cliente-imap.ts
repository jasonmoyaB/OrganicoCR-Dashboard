// La única pieza de `correo-poll` que toca la red. Todo lo demás del módulo es
// puro y corre bajo vitest; acá vive el `Deno.*` para que esa frontera sea
// evidente y no se filtre a los parsers.

import { aCadenaDeBytes } from "./bytes-texto.ts";
import { finDeRespuesta } from "./respuestas-imap.ts";
import { entrecomillar, soportaPlain, tokenPlain } from "./sasl-imap.ts";

const TIEMPO_LIMITE_MS = 20_000;
const INCOMPLETA = -1;
const FIN_DE_LINEA = "\r\n";

const CODIFICADOR = new TextEncoder();
const DECODIFICADOR = new TextDecoder();

export interface CredencialImap {
  host: string;
  puerto: number;
  usuario: string;
  clave: string;
  // Solo para el servidor de pruebas local, que usa un certificado propio. En
  // producción va vacío y rige la confianza del sistema. Sumar una CA nunca
  // apaga TLS, así que la variable es inofensiva si se filtra.
  certificados?: string[];
}

export interface ClienteImap {
  ordenar(orden: string): Promise<Uint8Array>;
  texto(orden: string): Promise<string>;
  cerrar(): void;
}

function concatenar(uno: Uint8Array, otro: Uint8Array): Uint8Array {
  const junto = new Uint8Array(uno.length + otro.length);
  junto.set(uno);
  junto.set(otro, uno.length);
  return junto;
}

function conTiempoLimite<T>(promesa: Promise<T>, quePasaba: string): Promise<T> {
  return new Promise((resolver, rechazar) => {
    const reloj = setTimeout(
      () => rechazar(new Error(`El servidor IMAP no respondió ${quePasaba}`)),
      TIEMPO_LIMITE_MS,
    );
    promesa.then(resolver, rechazar).finally(() => clearTimeout(reloj));
  });
}


export async function abrirBuzon(credencial: CredencialImap): Promise<ClienteImap> {
  const conexion = await Deno.connectTls({
    hostname: credencial.host,
    port: credencial.puerto,
    caCerts: credencial.certificados,
  });

  const lector = conexion.readable.getReader();
  let pendiente = new Uint8Array(0);
  let contador = 0;

  async function leerHasta(cierre: (datos: Uint8Array) => number, quePasaba: string) {
    for (;;) {
      const fin = cierre(pendiente);
      if (fin !== INCOMPLETA) {
        const respuesta = pendiente.slice(0, fin);
        pendiente = pendiente.slice(fin);
        return respuesta;
      }

      const { value, done } = await conTiempoLimite(lector.read(), quePasaba);
      if (done || !value) throw new Error("El servidor IMAP cerró la conexión sin responder");
      pendiente = concatenar(pendiente, value);
    }
  }

  async function ordenar(orden: string): Promise<Uint8Array> {
    const etiqueta = `c${++contador}`;
    await conexion.write(CODIFICADOR.encode(`${etiqueta} ${orden}${FIN_DE_LINEA}`));

    // El nombre de la orden va sin argumentos a propósito: los de
    // AUTHENTICATE son la credencial.
    const nombre = orden.split(" ")[0];
    const respuesta = await leerHasta((datos) => finDeRespuesta(datos, etiqueta), `a ${nombre}`);
    const texto = DECODIFICADOR.decode(respuesta);

    const desenlace = new RegExp(`^${etiqueta} (NO|BAD)(.*)$`, "m").exec(texto);
    if (desenlace) throw new Error(`${nombre}: ${desenlace[1]}${desenlace[2]}`);

    return respuesta;
  }

  const finDeLinea = (datos: Uint8Array) => {
    const corte = aCadenaDeBytes(datos).indexOf(FIN_DE_LINEA);
    return corte === INCOMPLETA ? INCOMPLETA : corte + FIN_DE_LINEA.length;
  };

  // AUTHENTICATE en dos pasos: primero la orden pelada, y el token recién
  // cuando el servidor contesta `+`. Dovecot anuncia SASL-IR y aceptaría las
  // dos cosas en la misma línea; el diálogo de dos pasos lo entienden todos.
  async function autenticarPlain(usuario: string, clave: string): Promise<void> {
    const etiqueta = `c${++contador}`;
    await conexion.write(CODIFICADOR.encode(`${etiqueta} AUTHENTICATE PLAIN${FIN_DE_LINEA}`));

    const invitacion = DECODIFICADOR.decode(await leerHasta(finDeLinea, "a AUTHENTICATE"));
    if (!invitacion.startsWith("+")) throw new Error(`AUTHENTICATE: ${invitacion.trim()}`);

    await conexion.write(CODIFICADOR.encode(`${tokenPlain(usuario, clave)}${FIN_DE_LINEA}`));
    const cierre = await leerHasta((datos) => finDeRespuesta(datos, etiqueta), "a AUTHENTICATE");

    const desenlace = new RegExp(`^${etiqueta} (NO|BAD)(.*)$`, "m").exec(
      DECODIFICADOR.decode(cierre),
    );
    if (desenlace) throw new Error(`AUTHENTICATE: ${desenlace[1]}${desenlace[2]}`);
  }

  // El saludo llega solo, sin que nadie lo pida, y hay que consumirlo antes de
  // mandar la primera orden o se mezcla con su respuesta.
  await leerHasta(finDeLinea, "el saludo inicial");

  const capacidades = DECODIFICADOR.decode(await ordenar("CAPABILITY"));
  if (soportaPlain(capacidades)) {
    await autenticarPlain(credencial.usuario, credencial.clave);
  } else {
    // La clave viaja como argumento, así que va entrecomillada y escapada.
    // `ordenar` solo registra el nombre de la orden, nunca sus argumentos.
    await ordenar(
      `LOGIN ${entrecomillar(credencial.usuario)} ${entrecomillar(credencial.clave)}`,
    );
  }

  return {
    ordenar,
    texto: async (orden) => DECODIFICADOR.decode(await ordenar(orden)),
    cerrar: () => {
      lector.releaseLock();
      conexion.close();
    },
  };
}
