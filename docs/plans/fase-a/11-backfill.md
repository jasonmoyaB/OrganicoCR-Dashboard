« [Fase A](README.md)

# 11 · Script de backfill

**Produce:** los pedidos históricos de WooCommerce dentro de la base.

Va antes del webhook: llena la base en minutos, mientras que el webhook obliga a esperar a que entre un pedido nuevo. Datos reales primero, para construir la UI contra datos de verdad y no contra mocks.

**Files:**
- Create: `scripts/backfill-woo.ts`
- Modify: `package.json`

- [x] **Step 1: Verificar las credenciales**

Las de WooCommerce ya están en `.env.local`. Las de Supabase se completaron en la [tarea 04](04-cliente-supabase.md). Confirmar que las cuatro que usa este script tienen valor:

```bash
grep -E "^(WOO_URL|WOO_CONSUMER_KEY|WOO_CONSUMER_SECRET|SUPABASE_URL|SUPABASE_SECRET_KEY)=." .env.local | cut -d= -f1
```

Expected: las cinco claves listadas. Si falta alguna, aparece vacía y el script fallará con `Falta la variable de entorno X`.

Ninguna lleva prefijo `VITE_`: este script corre en Node, no en el navegador.

- [x] **Step 2: Dependencias del script**

```bash
pnpm add -D tsx
```

**Sin `dotenv`.** `import "dotenv/config"` carga `.env`, y el archivo del proyecto es `.env.local`: el script fallaría con `Falta la variable de entorno WOO_URL` y el motivo no sería evidente. Node ya trae `--env-file`, que es lo que usa `usuario:dev`.

- [x] **Step 3: Escribir el script**

`scripts/backfill-woo.ts`:

```ts
import { createClient } from "@supabase/supabase-js";
import { mapearPedidoWoo, type OrdenWoo } from "../supabase/functions/woo-webhook/mapear-pedido";

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
  url.searchParams.set("status", "any");
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
```

## Cuatro cosas que no son obvias

**La autenticación va por query string, no por el header `Authorization`.** El hosting de la tienda descarta ese header antes de que llegue a WordPress: con Basic Auth la API devuelve `401 woocommerce_rest_cannot_view` aunque las credenciales sean correctas. Verificado contra la tienda real el 2026-09-11.

**`status=any` es obligatorio.** Sin ese parámetro WooCommerce omite estados de la respuesta y se pierden pedidos en silencio.

**Se llama a `upsert_pedido` por RPC, no a `.upsert()` de supabase-js.** El cliente JS no permite elegir qué columnas se actualizan en caso de conflicto, y actualizaría `estado_pago` — borrando la conciliación. La regla vive en la función SQL. El RPC hace el script re-ejecutable: correrlo dos veces no duplica nada.

**Usar la secret key acá es correcto.** El script corre en la máquina del desarrollador, no en el navegador, y necesita saltarse RLS para escribir.

- [x] **Step 4: Agregar el script a `package.json`**

Dentro de `"scripts"`:

```json
"backfill": "tsx --env-file=.env.local scripts/backfill-woo.ts"
```

- [x] **Step 5: Correr el backfill**

Run: `pnpm backfill`
Expected:

```
Escribiendo en http://127.0.0.1:54321
Página 1: 14 pedidos (acumulado 14)
Backfill completo: 14 pedidos.
```

Vale mirar la primera línea antes que el resto. Si dice una URL de `supabase.co`, el script está escribiendo en la nube.

Reparto resultante: **10 `pagado`** (₡52 852), **1 `anulado`** (₡1 675), **3 `pendiente`** (₡33 845).

Si devuelve 401, revisar la tabla de diagnóstico en [referencia de la tienda](../../referencia/tienda-woocommerce.md).

- [x] **Step 6: Verificar que re-ejecutarlo no borra trabajo**

Es la prueba que protege toda la Fase C, corrida contra datos reales y no contra un fixture:

```bash
# marcar un pedido como pagado a mano, igual que haría el botón
docker exec supabase_db_OrganicoCR-Dashboard psql -U postgres -d postgres -tAc "update pedidos set estado_pago='pagado' where numero_pedido='1062';"

pnpm backfill

docker exec supabase_db_OrganicoCR-Dashboard psql -U postgres -d postgres -tAc "select estado_pago from pedidos where numero_pedido='1062'; select count(*) from pedidos;"
```

Expected: sigue `pagado`, y siguen siendo 14 filas. WooCommerce reporta ese pedido como `on-hold`, o sea deuda; si el backfill mandara, la conciliación se habría perdido en silencio. Revertir con un `update` a `pendiente` al terminar.

- [ ] **Step 7: Verificar en la UI**

Run: `pnpm dev`

Expected: la sección "Deben" muestra **3 pedidos** — 1062 Ana María Solano (₡12 036), 1063 Anniella Li (₡8 614), 1064 Nadav Chudler (₡13 195) — con un total de **₡33 845**.

Este es el momento de contrastar el número con el cliente.

- [x] **Step 8: Commit**

```bash
git add scripts package.json
git commit -m "feat(woo): script de backfill de pedidos históricos"
```

---

« [10 · Mapeo de WooCommerce](10-mapeo-woo.md) · [12 · Webhook →](12-webhook.md)
