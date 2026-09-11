import { createClient } from "@supabase/supabase-js";
import {
  mapearPedidoWoo,
  type OrdenWoo,
} from "../supabase/functions/woo-webhook/mapear-pedido";

const PEDIDOS_POR_PAGINA = 100;

function leerEnv(clave: string): string {
  const valor = process.env[clave];
  if (!valor) throw new Error(`Falta la variable de entorno ${clave}`);
  return valor;
}

async function fetchPagina(pagina: number): Promise<OrdenWoo[]> {
  const url = new URL("/wp-json/wc/v3/orders", leerEnv("WOO_URL"));
  url.searchParams.set("per_page", String(PEDIDOS_POR_PAGINA));
  url.searchParams.set("page", String(pagina));
  url.searchParams.set("orderby", "date");
  url.searchParams.set("order", "asc");
  // Sin status=any WooCommerce omite estados y se pierden pedidos en silencio.
  url.searchParams.set("status", "any");
  // El hosting descarta el header Authorization antes de que llegue a
  // WordPress: con Basic Auth la API responde 401 aunque las claves sean
  // correctas. Por eso las credenciales van en la query string.
  url.searchParams.set("consumer_key", leerEnv("WOO_CONSUMER_KEY"));
  url.searchParams.set("consumer_secret", leerEnv("WOO_CONSUMER_SECRET"));

  const respuesta = await fetch(url);

  if (!respuesta.ok) {
    throw new Error(`WooCommerce devolvió ${respuesta.status}: ${await respuesta.text()}`);
  }

  return respuesta.json();
}

async function main() {
  const destino = leerEnv("SUPABASE_URL");
  // El script escribe con la secret key y se salta RLS. Decir en voz alta a
  // qué base apunta evita descubrir tarde que se escribió en producción.
  console.log(`Escribiendo en ${destino}`);

  const supabase = createClient(destino, leerEnv("SUPABASE_SECRET_KEY"));

  let pagina = 1;
  let totalImportados = 0;

  while (true) {
    const ordenes = await fetchPagina(pagina);
    if (ordenes.length === 0) break;

    const filas = ordenes.map(mapearPedidoWoo);

    for (const fila of filas) {
      // RPC y no .upsert() de supabase-js: el cliente JS no permite elegir qué
      // columnas se pisan en el conflicto y sobrescribiría estado_pago,
      // borrando la conciliación. La regla vive en la función SQL.
      const { error } = await supabase.rpc("upsert_pedido", { p: fila });
      if (error) {
        throw new Error(`Error al insertar el pedido ${fila.woo_order_id}: ${error.message}`);
      }
    }

    totalImportados += filas.length;
    console.log(`Página ${pagina}: ${filas.length} pedidos (acumulado ${totalImportados})`);
    pagina += 1;
  }

  console.log(`Backfill completo: ${totalImportados} pedidos.`);
}

main().catch((error: Error) => {
  console.error(error.message);
  process.exit(1);
});
