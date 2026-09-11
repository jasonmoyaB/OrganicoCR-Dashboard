« [Fase A](README.md)

# 12 · Edge Function del webhook

**Produce:** endpoint que recibe los pedidos de WooCommerce en tiempo real, con verificación HMAC. 4 tests.

**Files:**
- Create: `supabase/functions/woo-webhook/verificar-firma.ts` + `.test.ts`
- Create: `supabase/functions/woo-webhook/index.ts`

- [ ] **Step 1: Escribir el test de la firma**

`supabase/functions/woo-webhook/verificar-firma.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { verificarFirma } from "./verificar-firma";

const SECRETO = "secreto-de-prueba";
const CUERPO = '{"id":1234}';
// HMAC-SHA256 de CUERPO con SECRETO, en base64
const FIRMA_VALIDA = "4qHqgfxRlfLMKvCLiBRRm36u8bHCRnTMVqGhm4pWZKk=";

describe("verificarFirma", () => {
  it("acepta una firma correcta", async () => {
    expect(await verificarFirma(CUERPO, FIRMA_VALIDA, SECRETO)).toBe(true);
  });

  it("rechaza una firma alterada", async () => {
    expect(await verificarFirma(CUERPO, "AAAA", SECRETO)).toBe(false);
  });

  it("rechaza un cuerpo alterado con firma válida", async () => {
    expect(await verificarFirma('{"id":9999}', FIRMA_VALIDA, SECRETO)).toBe(false);
  });

  it("rechaza una firma ausente", async () => {
    expect(await verificarFirma(CUERPO, null, SECRETO)).toBe(false);
  });
});
```

Si `FIRMA_VALIDA` no coincide, generar el valor real y pegarlo en la constante — es un valor de referencia, no una expectativa de diseño:

```bash
node -e "console.log(require('crypto').createHmac('sha256','secreto-de-prueba').update('{\"id\":1234}').digest('base64'))"
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `pnpm test supabase/functions/woo-webhook/verificar-firma.test.ts`
Expected: FAIL — módulo no encontrado.

- [ ] **Step 3: Implementar la verificación**

`supabase/functions/woo-webhook/verificar-firma.ts`:

```ts
export async function verificarFirma(
  cuerpoCrudo: string,
  firmaRecibida: string | null,
  secreto: string,
): Promise<boolean> {
  if (!firmaRecibida) return false;

  const codificador = new TextEncoder();
  const clave = await crypto.subtle.importKey(
    "raw",
    codificador.encode(secreto),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const firma = await crypto.subtle.sign("HMAC", clave, codificador.encode(cuerpoCrudo));
  const esperada = btoa(String.fromCharCode(...new Uint8Array(firma)));

  return esperada === firmaRecibida;
}
```

Se usa `crypto.subtle` (Web Crypto) y no `node:crypto` porque las Edge Functions corren en Deno.

**La firma se calcula sobre el cuerpo crudo, nunca sobre el JSON re-serializado.** `JSON.stringify(JSON.parse(x))` puede reordenar claves o cambiar el escapado, y entonces toda firma válida se rechaza.

- [ ] **Step 4: Correr y verificar que pasa**

Run: `pnpm test supabase/functions/woo-webhook/verificar-firma.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Implementar la Edge Function**

`supabase/functions/woo-webhook/index.ts`:

```ts
import { createClient } from "jsr:@supabase/supabase-js@2";
import { mapearPedidoWoo, type OrdenWoo } from "./mapear-pedido.ts";
import { verificarFirma } from "./verificar-firma.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const secretoWebhook = Deno.env.get("WOO_WEBHOOK_SECRET")!;

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const cuerpoCrudo = await req.text();
  const firma = req.headers.get("x-wc-webhook-signature");
  const topic = req.headers.get("x-wc-webhook-topic");

  const firmaValida = await verificarFirma(cuerpoCrudo, firma, secretoWebhook);

  const { data: evento } = await supabase
    .from("webhook_eventos")
    .insert({
      fuente: "woocommerce",
      topic,
      payload: firmaValida ? JSON.parse(cuerpoCrudo) : { cuerpo_rechazado: cuerpoCrudo },
      firma_valida: firmaValida,
    })
    .select("id")
    .single();

  if (!firmaValida) {
    return new Response("Firma inválida", { status: 401 });
  }

  try {
    const orden = JSON.parse(cuerpoCrudo) as OrdenWoo;
    const fila = mapearPedidoWoo(orden);

    const { error } = await supabase.rpc("upsert_pedido", { p: fila });

    if (error) throw new Error(error.message);

    await supabase
      .from("webhook_eventos")
      .update({ procesado_ok: true })
      .eq("id", evento!.id);

    return new Response("OK", { status: 200 });
  } catch (error) {
    await supabase
      .from("webhook_eventos")
      .update({ procesado_ok: false, error: (error as Error).message })
      .eq("id", evento!.id);

    return new Response("Error al procesar", { status: 500 });
  }
});
```

El evento se registra **antes** de procesarlo, incluso cuando la firma es inválida. Si el upsert revienta, el payload ya está guardado y se puede re-procesar sin pedirle nada a WooCommerce. Los intentos con firma inválida también quedan: un pico ahí significa que alguien está sondeando el endpoint.

- [ ] **Step 6: Configurar el secreto y servir localmente**

```bash
echo "WOO_WEBHOOK_SECRET=secreto-de-prueba" >> supabase/functions/.env
supabase functions serve woo-webhook --env-file supabase/functions/.env
```

- [ ] **Step 7: Probar con una firma válida**

En otra terminal:

```bash
CUERPO='{"id":9999,"number":"9999","status":"on-hold","currency":"CRC","total":"5000.00","date_created_gmt":"2026-09-10T12:00:00","billing":{"first_name":"Test","last_name":"Webhook","email":"test@example.com","phone":""}}'
FIRMA=$(node -e "console.log(require('crypto').createHmac('sha256','secreto-de-prueba').update(process.argv[1]).digest('base64'))" "$CUERPO")

curl -i -X POST http://127.0.0.1:54321/functions/v1/woo-webhook \
  -H "Content-Type: application/json" \
  -H "x-wc-webhook-signature: $FIRMA" \
  -H "x-wc-webhook-topic: order.created" \
  -d "$CUERPO"
```

Expected: `HTTP/1.1 200 OK` y cuerpo `OK`.

- [ ] **Step 8: Probar con una firma inválida**

```bash
curl -i -X POST http://127.0.0.1:54321/functions/v1/woo-webhook \
  -H "Content-Type: application/json" \
  -H "x-wc-webhook-signature: firma-falsa" \
  -d "$CUERPO"
```

Expected: `HTTP/1.1 401 Unauthorized`.

- [ ] **Step 9: Verificar en la base**

```bash
PSQL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
psql "$PSQL" -c "select woo_order_id, cliente_nombre, total_centimos, estado_pago from pedidos where woo_order_id = 9999;"
psql "$PSQL" -c "select firma_valida, procesado_ok, error from webhook_eventos order by id desc limit 2;"
```

Expected:
- El pedido 9999 existe con `total_centimos = 500000` y `estado_pago = 'pendiente'`
- Dos eventos: uno con `firma_valida = true, procesado_ok = true`, otro con `firma_valida = false, procesado_ok = null`

- [ ] **Step 10: Verificar idempotencia**

Repetir el curl del Step 7 y contar filas:

```bash
psql "$PSQL" -c "select count(*) from pedidos where woo_order_id = 9999;"
```

Expected: `1`. Si sale `2`, el `on conflict` de `upsert_pedido` está mal.

- [ ] **Step 11: Verificar que un update de Woo no pisa el estado de pago**

**Este es el invariante que protege todo el trabajo de conciliación de la Fase C.** Marcar el pedido como pagado, reenviar el webhook, confirmar que sigue pagado:

```bash
psql "$PSQL" -c "update pedidos set estado_pago = 'pagado' where woo_order_id = 9999;"
```

Reenviar el curl del Step 7 y comprobar:

```bash
psql "$PSQL" -c "select estado_pago, estado_woo from pedidos where woo_order_id = 9999;"
```

Expected: `pagado | on-hold`. Si sale `pendiente`, el `do update set` está incluyendo `estado_pago` y hay que quitarlo.

- [ ] **Step 12: Verificar que una cancelación sí saca el pedido de la deuda**

```bash
psql "$PSQL" -c "update pedidos set estado_pago = 'pendiente' where woo_order_id = 9999;"
```

Reenviar el curl del Step 7 pero con `"status":"cancelled"` en el cuerpo — **recalculando la firma**, que cambia con el cuerpo. Comprobar:

```bash
psql "$PSQL" -c "select estado_pago from pedidos where woo_order_id = 9999;"
```

Expected: `anulado`.

- [ ] **Step 13: Commit**

```bash
git add supabase/functions
git commit -m "feat(woo): edge function del webhook con verificación HMAC"
```

---

« [11 · Backfill](11-backfill.md) · [13 · Despliegue →](13-despliegue.md)
