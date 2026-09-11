« [Fase A](README.md)

# 09 · Página "Deben"

**Produce:** la pantalla completa funcionando contra datos reales de la base.

**Files:**
- Create: `src/features/pedidos/components/pedidos-deben-page.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Página con búsqueda**

`src/features/pedidos/components/pedidos-deben-page.tsx`:

```tsx
import { useMemo, useState } from "react";
import { usePedidosPendientes } from "../hooks/use-pedidos-pendientes";
import { PedidosDebenTable } from "./pedidos-deben-table";
import { TotalPendienteCard } from "./total-pendiente-card";

export function PedidosDebenPage() {
  const { pedidos, totalCentimos, cargando, error, marcarPagado, marcandoPagado } =
    usePedidosPendientes();
  const [busqueda, setBusqueda] = useState("");

  const filtrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return pedidos;

    return pedidos.filter(
      (p) =>
        p.clienteNombre.toLowerCase().includes(termino) ||
        p.numeroPedido.includes(termino),
    );
  }, [pedidos, busqueda]);

  if (cargando) return <div className="p-8 text-neutral-500">Cargando pedidos…</div>;
  if (error) return <div className="p-8 text-red-600">{error.message}</div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-8">
      <h1 className="text-2xl font-semibold">Deben</h1>

      <TotalPendienteCard
        totalCentimos={totalCentimos}
        cantidadPedidos={pedidos.length}
      />

      <input
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar por cliente o número de pedido"
        className="w-full rounded-lg border px-4 py-2"
      />

      <PedidosDebenTable
        pedidos={filtrados}
        onMarcarPagado={marcarPagado}
        marcandoPagado={marcandoPagado}
      />
    </div>
  );
}
```

**El total refleja todos los pendientes, no los filtrados.** Filtrar es para encontrar un pedido; el total es lo que le deben en conjunto, y cambiarlo al escribir en el buscador sería confuso.

- [ ] **Step 2: Conectar en `App.tsx`**

Agregar el import arriba:

```tsx
import { PedidosDebenPage } from "@/features/pedidos/components/pedidos-deben-page";
```

Reemplazar la línea `return <div className="p-8">Sesión iniciada.</div>;` con:

```tsx
  return <PedidosDebenPage />;
```

- [ ] **Step 3: Insertar pedidos de prueba**

```bash
supabase db reset
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "insert into pedidos (woo_order_id, numero_pedido, cliente_nombre, total_centimos, estado_woo, fecha_pedido, raw) values (9001, '9001', 'Ana Rojas', 1500000, 'on-hold', now() - interval '10 days', '{}'::jsonb), (9002, '9002', 'Carlos Mora', 875050, 'on-hold', now() - interval '2 days', '{}'::jsonb);"
```

- [ ] **Step 4: Verificar a mano**

Run: `pnpm dev`, entrar con las credenciales.

1. Total pendiente = `₡23 750,50`, "2 pedidos"
2. Ana Rojas aparece primero (más vieja) y sus "10 días" están en rojo
3. Buscar "carlos" deja una fila; **el total sigue mostrando ₡23 750,50**
4. "Marcar pagado" en Ana Rojas → desaparece de la lista y el total baja a `₡8 750,50`

- [ ] **Step 5: Commit**

```bash
git add src/
git commit -m "feat(pedidos): sección Deben con búsqueda y marcado manual"
```

---

« [08 · Componentes](08-pedidos-componentes.md) · [10 · Mapeo de WooCommerce →](10-mapeo-woo.md)
