« [Fase A](README.md)

# 10 · Mapeo de pedidos de WooCommerce (TDD)

**Produce:** `mapearPedidoWoo` y `estadoPagoInicial` — funciones puras compartidas por el backfill y el webhook. 11 tests.

Antes de escribir el regex mental, leer [cómo se comporta la tienda real](../../referencia/tienda-woocommerce.md). Varios de los tests de abajo existen por cosas que la tienda hace de verdad.

**Files:**
- Create: `supabase/functions/woo-webhook/mapear-pedido.ts` + `.test.ts`

- [x] **Step 1: Escribir los tests**

`supabase/functions/woo-webhook/mapear-pedido.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { estadoPagoInicial, mapearPedidoWoo } from "./mapear-pedido";

const ORDEN_WOO = {
  id: 1234,
  number: "1234",
  status: "on-hold",
  currency: "CRC",
  total: "15000.00",
  date_created_gmt: "2026-09-01T10:00:00",
  billing: {
    first_name: "Ana",
    last_name: "Rojas",
    email: "ana@example.com",
    phone: "88887777",
  },
};

describe("mapearPedidoWoo", () => {
  it("extrae los campos que nos importan", () => {
    const fila = mapearPedidoWoo(ORDEN_WOO);

    expect(fila.woo_order_id).toBe(1234);
    expect(fila.numero_pedido).toBe("1234");
    expect(fila.cliente_nombre).toBe("Ana Rojas");
    expect(fila.total_centimos).toBe(1_500_000);
    expect(fila.estado_woo).toBe("on-hold");
  });

  it("interpreta date_created_gmt como UTC", () => {
    expect(mapearPedidoWoo(ORDEN_WOO).fecha_pedido).toBe("2026-09-01T10:00:00.000Z");
  });

  // La tienda devuelve el total sin decimales: "13195", no "13195.00".
  it("convierte un total sin decimales", () => {
    const sinDecimales = { ...ORDEN_WOO, total: "13195" };
    expect(mapearPedidoWoo(sinDecimales).total_centimos).toBe(1_319_500);
  });

  it("usa el correo cuando no hay nombre en el billing", () => {
    const sinNombre = {
      ...ORDEN_WOO,
      billing: { ...ORDEN_WOO.billing, first_name: "", last_name: "" },
    };
    expect(mapearPedidoWoo(sinNombre).cliente_nombre).toBe("ana@example.com");
  });

  it("usa un marcador cuando no hay ni nombre ni correo", () => {
    const anonimo = {
      ...ORDEN_WOO,
      billing: { first_name: "", last_name: "", email: "", phone: "" },
    };
    expect(mapearPedidoWoo(anonimo).cliente_nombre).toBe("Pedido #1234");
  });

  it("convierte teléfono y correo vacíos a null", () => {
    const anonimo = {
      ...ORDEN_WOO,
      billing: { first_name: "", last_name: "", email: "", phone: "" },
    };
    const fila = mapearPedidoWoo(anonimo);
    expect(fila.cliente_email).toBeNull();
    expect(fila.cliente_telefono).toBeNull();
  });

  it("guarda la orden completa en raw para poder re-procesar", () => {
    expect(mapearPedidoWoo(ORDEN_WOO).raw).toEqual(ORDEN_WOO);
  });
});

describe("estadoPagoInicial", () => {
  it("trata completed como cobrado", () => {
    expect(estadoPagoInicial("completed")).toBe("pagado");
  });

  it("trata processing y on-hold como deuda", () => {
    expect(estadoPagoInicial("processing")).toBe("pendiente");
    expect(estadoPagoInicial("on-hold")).toBe("pendiente");
    expect(estadoPagoInicial("pending")).toBe("pendiente");
  });

  it("saca de la deuda lo que la tienda anuló", () => {
    expect(estadoPagoInicial("cancelled")).toBe("anulado");
    expect(estadoPagoInicial("refunded")).toBe("anulado");
    expect(estadoPagoInicial("failed")).toBe("anulado");
  });

  it("asume deuda ante un estado desconocido", () => {
    expect(estadoPagoInicial("estado-de-un-plugin")).toBe("pendiente");
  });
});
```

**Dos casos que no son hipotéticos:**

El de **nombre vacío** — WooCommerce permite checkout sin datos de facturación completos, y `cliente_nombre` es `not null` en el esquema. Sin fallback, el ingest reventaría con un pedido real.

El de **estado desconocido** — si un plugin introduce un estado nuevo, el pedido aparece en "Deben" y alguien lo ve. La alternativa, asumir que está pagado, lo esconde, y un cobro perdido no se descubre nunca.

- [x] **Step 2: Correr y verificar que falla**

Run: `pnpm test supabase/functions`
Expected: FAIL — módulo no encontrado.

- [x] **Step 3: Implementar**

`supabase/functions/woo-webhook/mapear-pedido.ts`:

```ts
export interface OrdenWoo {
  id: number;
  number: string;
  status: string;
  currency: string;
  total: string;
  date_created_gmt: string;
  billing: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
}

export type EstadoPagoInicial = "pendiente" | "pagado" | "anulado";

export interface FilaPedido {
  woo_order_id: number;
  numero_pedido: string;
  cliente_nombre: string;
  cliente_email: string | null;
  cliente_telefono: string | null;
  total_centimos: number;
  moneda: string;
  estado_woo: string;
  estado_pago: EstadoPagoInicial;
  fecha_pedido: string;
  raw: OrdenWoo;
}

const ESTADOS_WOO_COBRADOS = ["completed"];
const ESTADOS_WOO_ANULADOS = ["cancelled", "refunded", "failed"];

export function estadoPagoInicial(estadoWoo: string): EstadoPagoInicial {
  if (ESTADOS_WOO_COBRADOS.includes(estadoWoo)) return "pagado";
  if (ESTADOS_WOO_ANULADOS.includes(estadoWoo)) return "anulado";
  return "pendiente";
}

function montoACentimos(monto: string): number {
  if (monto.trim() === "") return 0;
  const valor = Number(monto);
  if (Number.isNaN(valor)) throw new Error(`Monto inválido: ${monto}`);
  return Math.round(valor * 100);
}

function resolverNombre(orden: OrdenWoo): string {
  const nombre = `${orden.billing.first_name} ${orden.billing.last_name}`.trim();
  if (nombre) return nombre;
  if (orden.billing.email) return orden.billing.email;
  return `Pedido #${orden.number}`;
}

export function mapearPedidoWoo(orden: OrdenWoo): FilaPedido {
  return {
    woo_order_id: orden.id,
    numero_pedido: orden.number,
    cliente_nombre: resolverNombre(orden),
    cliente_email: orden.billing.email || null,
    cliente_telefono: orden.billing.phone || null,
    total_centimos: montoACentimos(orden.total),
    moneda: orden.currency,
    estado_woo: orden.status,
    estado_pago: estadoPagoInicial(orden.status),
    fecha_pedido: new Date(`${orden.date_created_gmt}Z`).toISOString(),
    raw: orden,
  };
}
```

## Verificado contra la tienda real

Una orden de verdad, al 2026-09-11:

```
#1064   status=processing   total='13195'   currency=CRC
   date_created_gmt = '2026-09-07T17:34:26'
   date_created     = '2026-09-07T11:34:26'
   payment_method='cod'  title='Sinpe Movil/Tarjeta'
```

Dos supuestos del mapeo quedan confirmados. `date_created_gmt` viene **sin zona**: las seis horas de diferencia contra `date_created` son el UTC-6 de Costa Rica, y son exactamente las que se pierden si falta la `Z`. Y `total` viene **sin decimales** — de ahí el test de `"13195"`.

## Tres decisiones que hay que entender

**`estado_pago` derivado de Woo vale solo como semilla inicial.** La función `upsert_pedido` de la [tarea 03](03-migracion.md) lo escribe únicamente al insertar; en cualquier update posterior manda nuestra base. Eso concilia [P2](../../specs/03-principios.md) con la realidad de que algo hay que sembrar el día del arranque: se confía en Woo una vez, para el primer valor, y nunca más.

**`montoACentimos` se duplica acá a propósito.** Las Edge Functions corren en Deno y no pueden importar de `src/`, que se compila con la config de Vite. Son dos runtimes, no un caso de código compartido. El test de arriba cubre esta copia.

**La `Z` que se le pega a `date_created_gmt` es obligatoria.** WooCommerce devuelve `2026-09-01T10:00:00` sin zona, y `new Date()` sobre eso lo interpreta en la zona local del servidor. En Costa Rica eso desplaza cada pedido seis horas.

- [x] **Step 4: Correr y verificar que pasa**

Run: `pnpm test supabase/functions`
Expected: PASS, **11 tests** — 7 de `mapearPedidoWoo` y 4 de `estadoPagoInicial`.

- [x] **Step 5: Commit**

```bash
git add supabase/functions
git commit -m "feat(woo): mapeo de órdenes de WooCommerce a filas de pedidos"
```

## Qué produce contra los datos reales

De los 14 pedidos de la tienda al 2026-09-11: **10 quedan `pagado`** (incluidos 8 de prueba), **1 `anulado`**, **3 `pendiente`** — los pedidos 1062, 1063 y 1064, que suman **₡33 845** de deuda real.

---

« [09 · Página "Deben"](09-pedidos-pagina.md) · [11 · Backfill →](11-backfill.md)
