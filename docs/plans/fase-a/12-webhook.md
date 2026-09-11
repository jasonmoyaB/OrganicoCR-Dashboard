« [Fase A](README.md)

# 12 · Edge Function del webhook

**Produce:** endpoint que recibe los pedidos de WooCommerce en tiempo real, con verificación HMAC. 8 tests.

**Files:**
- Create: `supabase/functions/woo-webhook/verificar-firma.ts` + `.test.ts`
- Create: `supabase/functions/woo-webhook/es-ping.ts` + `.test.ts`
- Create: `supabase/functions/woo-webhook/index.ts`

- [x] **Step 1: Escribir el test de la firma**

`supabase/functions/woo-webhook/verificar-firma.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { verificarFirma } from "./verificar-firma";

const SECRETO = "secreto-de-prueba";
const CUERPO = '{"id":1234}';
// HMAC-SHA256 de CUERPO con SECRETO, en base64
const FIRMA_VALIDA = "cg4lAGu97/ReGhTYqOVuPTX3txi8EntNaKcZVLeXCR4=";

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

  // Un secreto mal configurado no puede parecerse a un secreto correcto.
  it("rechaza una firma válida calculada con otro secreto", async () => {
    expect(await verificarFirma(CUERPO, FIRMA_VALIDA, "otro-secreto")).toBe(false);
  });
});
```

Si `FIRMA_VALIDA` no coincide, generar el valor real y pegarlo en la constante — es un valor de referencia, no una expectativa de diseño:

```bash
node -e "console.log(require('crypto').createHmac('sha256','secreto-de-prueba').update('{\"id\":1234}').digest('base64'))"
```

- [x] **Step 2: Correr y verificar que falla**

Run: `pnpm test supabase/functions/woo-webhook/verificar-firma.test.ts`
Expected: FAIL — módulo no encontrado.

- [x] **Step 3: Implementar la verificación**

`supabase/functions/woo-webhook/verificar-firma.ts`:

```ts
// La firma se calcula SIEMPRE sobre el cuerpo crudo, nunca sobre el JSON
// re-serializado: JSON.stringify(JSON.parse(x)) puede reordenar claves o
// cambiar el escapado, y entonces toda firma legítima se rechaza.
export async function verificarFirma(
  cuerpoCrudo: string,
  firmaRecibida: string | null,
  secreto: string,
): Promise<boolean> {
  if (!firmaRecibida) return false;

  const firmaBytes = decodificarBase64(firmaRecibida);
  if (!firmaBytes) return false;

  const codificador = new TextEncoder();
  const clave = await crypto.subtle.importKey(
    "raw",
    codificador.encode(secreto),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );

  // subtle.verify y no comparar strings con ===: la comparación nativa es de
  // tiempo constante, y una con === filtra por cuántos caracteres coinciden.
  return crypto.subtle.verify("HMAC", clave, firmaBytes, codificador.encode(cuerpoCrudo));
}

function decodificarBase64(valor: string): Uint8Array | null {
  try {
    return Uint8Array.from(atob(valor), (caracter) => caracter.charCodeAt(0));
  } catch {
    return null;
  }
}
```

Se usa `crypto.subtle` (Web Crypto) y no `node:crypto` porque las Edge Functions corren en Deno.

**`subtle.verify` en vez de calcular la firma y compararla con `===`.** Una comparación de strings sale en cuanto encuentra el primer carácter distinto, y el tiempo que tarda filtra cuántos caracteres acertó el atacante. La comparación nativa es de tiempo constante y no cuesta nada más.

**La firma se calcula sobre el cuerpo crudo, nunca sobre el JSON re-serializado.** `JSON.stringify(JSON.parse(x))` puede reordenar claves o cambiar el escapado, y entonces toda firma válida se rechaza.

**`atob` lanza ante base64 inválido.** Una firma basura como `firma-falsa` no es base64 y tiraría la función entera con un 500 en vez de responder 401. Por eso va envuelta en un `try`.

- [x] **Step 4: Correr y verificar que pasa**

Run: `pnpm test supabase/functions/woo-webhook/verificar-firma.test.ts`
Expected: PASS, 5 tests.

- [x] **Step 4b: Responder al ping de activación**

WooCommerce hace una entrega de prueba al activar un webhook y **espera un 200**. Ese ping no se parece a un pedido: el cuerpo es `webhook_id=N`, form-encoded, y no trae cabecera de firma. Si la función lo rechaza, WooCommerce se niega a activar el webhook:

```
Error: La URL de entrega devolvió un código de respuesta: 401
```

`supabase/functions/woo-webhook/es-ping.ts`:

```ts
const CUERPO_PING = /^webhook_id=\d+$/;

export function esPingDeWoo(cuerpoCrudo: string): boolean {
  return CUERPO_PING.test(cuerpoCrudo.trim());
}
```

El patrón va anclado en los dos extremos y solo acepta dígitos. Este es el único cuerpo que la función responde **sin verificar el HMAC**, así que la laxitud se paga cara: `webhook_id=12&loquesea` no debe pasar, y hay un test que lo comprueba.

El ping no toca la base. Solo confirma que la URL responde.

- [x] **Step 5: Implementar la Edge Function**

`supabase/functions/woo-webhook/index.ts`:

```ts
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

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const cuerpoCrudo = await req.text();

  // El ping de activación va antes de todo lo demás: no trae firma, no trae
  // pedido, y no toca la base. Solo confirma que la URL responde.
  if (esPingDeWoo(cuerpoCrudo)) {
    return new Response("OK", { status: 200 });
  }

  const firma = req.headers.get("x-wc-webhook-signature");
  const topic = req.headers.get("x-wc-webhook-topic");

  const firmaValida = await verificarFirma(cuerpoCrudo, firma, secretoWebhook);

  const { data: evento, error: errorEvento } = await supabase
    .from("webhook_eventos")
    .insert({
      fuente: "woocommerce",
      topic,
      payload: firmaValida ? JSON.parse(cuerpoCrudo) : { cuerpo_rechazado: cuerpoCrudo },
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
```

Nada de `Deno.env.get(...)!`. Un `!` sobre una variable ausente convierte un error de configuración en un `null` que viaja hacia adentro y revienta en otro lado; `leerEnv` falla al arrancar y el log dice exactamente qué falta.

El evento se registra **antes** de procesarlo, incluso cuando la firma es inválida. Si el upsert revienta, el payload ya está guardado y se puede re-procesar sin pedirle nada a WooCommerce. Los intentos con firma inválida también quedan: un pico ahí significa que alguien está sondeando el endpoint.

- [x] **Step 6: Apagar la verificación de JWT**

Sin esto el webhook nunca funciona. El gateway de Supabase exige un JWT en toda Edge Function, WooCommerce no manda ninguno, y la respuesta llega **antes** de que la función corra:

```
{"msg":"Error: Missing authorization header"}
```

Al final de `supabase/config.toml`:

```toml
[functions.woo-webhook]
verify_jwt = false
```

El endpoint queda público a propósito. Quien lo autentica es la firma HMAC del cuerpo. Por eso la verificación de firma no es opcional ni se puede desactivar para depurar.

- [x] **Step 6b: Configurar el secreto y servir localmente**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Ese valor va a `.env.local` como `WOO_WEBHOOK_SECRET`, y de ahí a `supabase/functions/.env`. Los dos archivos están en `.gitignore`.

```bash
supabase functions serve woo-webhook --env-file supabase/functions/.env --no-verify-jwt
```

`serve` no lee `[functions.*]` de `config.toml`: la bandera hace falta igual en local.

- [x] **Step 7: Probar con una firma válida**

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

- [x] **Step 8: Probar con una firma inválida**

```bash
curl -i -X POST http://127.0.0.1:54321/functions/v1/woo-webhook \
  -H "Content-Type: application/json" \
  -H "x-wc-webhook-signature: firma-falsa" \
  -d "$CUERPO"
```

Expected: `HTTP/1.1 401 Unauthorized`.

- [x] **Step 9: Verificar en la base**

```bash
DB="docker exec supabase_db_OrganicoCR-Dashboard psql -U postgres -d postgres"
$DB -c "select woo_order_id, cliente_nombre, total_centimos, estado_pago from pedidos where woo_order_id = 9999;"
$DB -c "select firma_valida, procesado_ok, error from webhook_eventos order by id desc limit 2;"
```

Expected:
- El pedido 9999 existe con `total_centimos = 500000` y `estado_pago = 'pendiente'`
- Dos eventos: uno con `firma_valida = true, procesado_ok = true`, otro con `firma_valida = false, procesado_ok = null`

- [x] **Step 10: Verificar idempotencia**

Repetir el curl del Step 7 y contar filas:

```bash
$DB -c "select count(*) from pedidos where woo_order_id = 9999;"
```

Expected: `1`. Si sale `2`, el `on conflict` de `upsert_pedido` está mal.

- [x] **Step 11: Verificar que un update de Woo no pisa el estado de pago**

**Este es el invariante que protege todo el trabajo de conciliación de la Fase C.** Marcar el pedido como pagado, reenviar el webhook, confirmar que sigue pagado:

```bash
$DB -c "update pedidos set estado_pago = 'pagado' where woo_order_id = 9999;"
```

Reenviar el curl del Step 7 y comprobar:

```bash
$DB -c "select estado_pago, estado_woo from pedidos where woo_order_id = 9999;"
```

Expected: `pagado | on-hold`. Si sale `pendiente`, el `do update set` está incluyendo `estado_pago` y hay que quitarlo.

- [x] **Step 12: Verificar que una cancelación sí saca el pedido de la deuda**

```bash
$DB -c "update pedidos set estado_pago = 'pendiente' where woo_order_id = 9999;"
```

Reenviar el curl del Step 7 pero con `"status":"cancelled"` en el cuerpo — **recalculando la firma**, que cambia con el cuerpo. Comprobar:

```bash
$DB -c "select estado_pago from pedidos where woo_order_id = 9999;"
```

Expected: `anulado`.

- [x] **Step 13: Commit**

```bash
git add supabase/functions
git commit -m "feat(woo): edge function del webhook con verificación HMAC"
```

---

« [11 · Backfill](11-backfill.md) · [13 · Despliegue →](13-despliegue.md)
