« [Fase A](README.md)

# 09 · Página "Deben"

**Produce:** la pantalla completa funcionando contra datos reales de la base.

**Files:**
- Create: `src/features/pedidos/components/pedidos-deben-page.tsx`
- Create: `src/features/auth/hooks/use-logout.ts`
- Create: `src/components/app-header.tsx`
- Modify: `src/App.tsx`

- [x] **Step 1: Página con búsqueda**

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
      (pedido) =>
        pedido.clienteNombre.toLowerCase().includes(termino) ||
        pedido.numeroPedido.includes(termino),
    );
  }, [pedidos, busqueda]);

  if (cargando) return <div className="p-8 text-neutral-500">Cargando pedidos…</div>;
  if (error) return <div className="p-8 text-red-600">{error.message}</div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-8">
      <h1 className="text-2xl font-semibold text-neutral-900">Deben</h1>

      <TotalPendienteCard totalCentimos={totalCentimos} cantidadPedidos={pedidos.length} />

      <input
        value={busqueda}
        onChange={(evento) => setBusqueda(evento.target.value)}
        placeholder="Buscar por cliente o número de pedido"
        className="w-full rounded-lg border border-neutral-300 bg-white px-4 py-2 outline-none focus:border-green-700"
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

- [x] **Step 2: Salir de la sesión**

No estaba en el plan original. Se agrega porque `cerrarSesion()` quedó escrita en la tarea 05 sin ningún llamador — código muerto — y porque una sesión sin salida se queda viva en `localStorage` indefinidamente.

`src/features/auth/hooks/use-logout.ts`:

```ts
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { cerrarSesion } from "../services/auth-service";

export function useLogout() {
  const queryClient = useQueryClient();
  const [saliendo, setSaliendo] = useState(false);

  async function salir() {
    setSaliendo(true);
    try {
      await cerrarSesion();
      // Sin esto, los pedidos del usuario anterior siguen en caché y se ven
      // por un instante en el próximo login.
      queryClient.clear();
    } finally {
      setSaliendo(false);
    }
  }

  return { salir, saliendo };
}
```

`src/components/app-header.tsx` recibe el `email` como prop y consume `useLogout()`. Vive en `src/components/` y no dentro de una feature: lo usan las dos.

No hace falta redirigir después de salir. `onAuthStateChange` en `useSesion` ve el cambio, `sesion` pasa a `null` y `App` vuelve a renderizar el `LoginForm`.

- [x] **Step 3: Conectar en `App.tsx`**

```tsx
import { AppHeader } from "@/components/app-header";
import { LoginForm } from "@/features/auth/components/login-form";
import { useSesion } from "@/features/auth/hooks/use-sesion";
import { PedidosDebenPage } from "@/features/pedidos/components/pedidos-deben-page";

export default function App() {
  const { sesion, cargando } = useSesion();

  if (cargando) {
    return <div className="p-8 text-neutral-500">Cargando…</div>;
  }

  if (!sesion) {
    return <LoginForm />;
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <AppHeader email={sesion.user.email ?? ""} />
      <PedidosDebenPage />
    </div>
  );
}
```

`App` compone las dos features. Es el único lugar donde eso está permitido: un componente de `features/pedidos` no importa de `features/auth`.

- [x] **Step 4: Insertar pedidos de prueba**

No hay `psql` en el PATH en Windows. Se entra por el contenedor:

```bash
docker exec supabase_db_OrganicoCR-Dashboard psql -U postgres -d postgres -c "insert into pedidos (woo_order_id, numero_pedido, cliente_nombre, total_centimos, estado_woo, fecha_pedido, raw) values (9001, '9001', 'Ana Rojas', 1500000, 'on-hold', now() - interval '10 days', '{}'::jsonb), (9002, '9002', 'Carlos Mora', 875050, 'on-hold', now() - interval '2 days', '{}'::jsonb);"
```

`estado_pago` no se pasa: la columna tiene `default 'pendiente'`.

**No hace falta `supabase db reset` acá**, y conviene evitarlo: borra `auth.users` y el login deja de funcionar. Si se corre igual, reponer el usuario con `pnpm usuario:dev`.

- [x] **Step 5: Verificar contra la API**

Antes del navegador, para separar "la query está mal" de "el componente está mal". Con el token de la sesión:

| Llamada | Esperado |
|---|---|
| `GET /rest/v1/pedidos?estado_pago=eq.pendiente&order=fecha_pedido.asc` | 9001 primero, 9002 después; suma `2375050` |
| `PATCH /rest/v1/pedidos?id=eq.<id de 9001>` con `{"estado_pago":"pagado"}` | `204`, y 9001 desaparece de la lista de pendientes |

La segunda prueba que la policy de update para `authenticated` deja pasar el botón "Marcar pagado". Revertir con un `update` por el contenedor para dejar los datos listos para la prueba visual.

`formatColones(2375050)` da `₡23 750,50`, y `formatColones(875050)` da `₡8 750,50`.

- [ ] **Step 6: Verificar en el navegador**

Run: `pnpm dev`, entrar con las credenciales.

1. Total pendiente = `₡23 750,50`, "2 pedidos"
2. Ana Rojas aparece primero (más vieja) y sus "10 días" están en rojo
3. Buscar "carlos" deja una fila; **el total sigue mostrando ₡23 750,50**
4. "Marcar pagado" en Ana Rojas → desaparece de la lista y el total baja a `₡8 750,50`
5. "Salir" → vuelve al formulario de login

- [x] **Step 7: Commit**

```bash
git add src/
git commit -m "feat(pedidos): seccion Deben con busqueda, marcado manual y salir"
```

---

« [08 · Componentes](08-pedidos-componentes.md) · [10 · Mapeo de WooCommerce →](10-mapeo-woo.md)
