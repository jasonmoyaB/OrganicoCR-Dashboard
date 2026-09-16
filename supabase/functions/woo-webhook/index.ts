import { createClient } from "jsr:@supabase/supabase-js@2";
import { esPingDeWoo } from "./es-ping.ts";
import { mapearPedidoWoo, type OrdenWoo } from "./mapear-pedido.ts";
import { verificarFirma } from "./verificar-firma.ts";

function leerEnv(clave: string): string {
  const valor = Deno.env.get(clave);
  if (!valor) throw new Error(`Falta la variable de entorno ${clave}`);
  return valor;
}

// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY las inyecta el runtime de Edge
// Functions; no se declaran ni se pueden declarar (el prefijo SUPABASE_ está
// reservado para secrets). El runtime también expone SUPABASE_SECRET_KEYS, en
// plural y como JSON `{"default":"sb_secret_..."}`, pero el nombre de abajo es
// el estable y trae un solo valor listo para usar.
const supabase = createClient(
  leerEnv("SUPABASE_URL"),
  leerEnv("SUPABASE_SERVICE_ROLE_KEY"),
);
const secretoWebhook = leerEnv("WOO_WEBHOOK_SECRET");

// El endpoint es publico por diseno —WooCommerce no manda JWT y quien autentica
// es la firma HMAC—, pero el cuerpo se guarda en `webhook_eventos` ANTES de
// validar la firma. Sin tope, cualquiera llena la tabla con lo que quiera y de
// paso tapa la senal que esa bitacora existe para dar: un pico de firmas
// invalidas es alguien sondeando, y deja de leerse si el pico es el ataque.
//
// Un pedido de Woo con 50 lineas no pasa de unas decenas de kB.
const LARGO_MAXIMO = 512 * 1024;

// De un cuerpo rechazado se guarda el principio y el largo, no el cuerpo
// entero: alcanza para reconocer que sondearon y con que, sin convertir la
// tabla en el almacenamiento gratis de un desconocido.
const PREFIJO_RECHAZADO = 2048;

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const cuerpoCrudo = await req.text();

  if (cuerpoCrudo.length > LARGO_MAXIMO) {
    return new Response("Cuerpo demasiado grande", { status: 413 });
  }

  // El ping de activación va antes de todo lo demás: no trae firma, no trae
  // pedido, y no toca la base. Solo confirma que la URL responde.
  if (esPingDeWoo(cuerpoCrudo)) {
    return new Response("OK", { status: 200 });
  }

  const firma = req.headers.get("x-wc-webhook-signature");
  const topic = req.headers.get("x-wc-webhook-topic");

  const firmaValida = await verificarFirma(cuerpoCrudo, firma, secretoWebhook);

  // El evento se registra ANTES de procesarlo, y también cuando la firma es
  // inválida. Si el upsert revienta, el payload ya está guardado y se puede
  // re-procesar sin pedirle nada a WooCommerce. Los intentos con firma
  // inválida también quedan: un pico ahí es alguien sondeando el endpoint.
  const { data: evento, error: errorEvento } = await supabase
    .from("webhook_eventos")
    .insert({
      fuente: "woocommerce",
      topic,
      payload: firmaValida
        ? JSON.parse(cuerpoCrudo)
        : {
            cuerpo_rechazado: cuerpoCrudo.slice(0, PREFIJO_RECHAZADO),
            largo_original: cuerpoCrudo.length,
          },
      firma_valida: firmaValida,
    })
    .select("id")
    .single();

  // Sin bitácora tampoco hay forma de escribir el pedido. Un 500 hace que
  // WooCommerce reintente, que es lo que corresponde ante un fallo temporal.
  if (errorEvento || !evento) {
    console.error("No se pudo registrar el evento:", errorEvento?.message);
    return new Response("Error de base de datos", { status: 500 });
  }

  if (!firmaValida) {
    return new Response("Firma inválida", { status: 401 });
  }

  try {
    const fila = mapearPedidoWoo(JSON.parse(cuerpoCrudo) as OrdenWoo);
    const { error } = await supabase.rpc("upsert_pedido", { p: fila });
    if (error) throw new Error(error.message);

    await supabase.from("webhook_eventos").update({ procesado_ok: true }).eq("id", evento.id);

    return new Response("OK", { status: 200 });
  } catch (error) {
    await supabase
      .from("webhook_eventos")
      .update({ procesado_ok: false, error: (error as Error).message })
      .eq("id", evento.id);

    return new Response("Error al procesar", { status: 500 });
  }
});
