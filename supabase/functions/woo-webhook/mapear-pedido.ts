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

// Un estado desconocido cae en 'pendiente' a propósito: el pedido aparece en
// "Deben" y alguien lo ve. Asumirlo pagado lo esconde, y un cobro perdido así
// no se descubre nunca.
export function estadoPagoInicial(estadoWoo: string): EstadoPagoInicial {
  if (ESTADOS_WOO_COBRADOS.includes(estadoWoo)) return "pagado";
  if (ESTADOS_WOO_ANULADOS.includes(estadoWoo)) return "anulado";
  return "pendiente";
}

// Copia deliberada de src/utils/monto-a-centimos.ts: las Edge Functions corren
// en Deno y no pueden importar de src/, que se compila con la config de Vite.
// Son dos runtimes, no código compartido.
function montoACentimos(monto: string): number {
  if (monto.trim() === "") return 0;
  const valor = Number(monto);
  if (Number.isNaN(valor)) throw new Error(`Monto inválido: ${monto}`);
  return Math.round(valor * 100);
}

// cliente_nombre es not null en el esquema, y WooCommerce permite checkout sin
// datos de facturación completos. Sin fallback, el ingest revienta con un
// pedido real.
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
    // La Z es obligatoria: WooCommerce devuelve `2026-09-01T10:00:00` sin zona,
    // y new Date() sobre eso lo lee en la zona local. En Costa Rica cada pedido
    // se desplazaría seis horas.
    fecha_pedido: new Date(`${orden.date_created_gmt}Z`).toISOString(),
    raw: orden,
  };
}
