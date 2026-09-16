# OrganicoCR Dashboard — Documentación

Dashboard de conciliación de pagos para la tienda WooCommerce de OrganicoCR. Cruza los pagos que llegan por correo del banco contra los pedidos de la tienda, y muestra quién debe y quién pagó.

## Por dónde empezar

**Si vas a implementar algo:** leé [`referencia/convenciones.md`](referencia/convenciones.md) y luego la tarea concreta en [`plans/fase-a/`](plans/fase-a/README.md). No hace falta leer el spec completo para ejecutar una tarea — cada una es autocontenida.

**Si vas a tomar una decisión de diseño:** leé [`specs/`](specs/README.md) empezando por los principios.

**Si algo del comportamiento de WooCommerce te sorprende:** está en [`referencia/tienda-woocommerce.md`](referencia/tienda-woocommerce.md).

## Mapa

| Carpeta | Qué contiene | Cuándo leerla |
|---|---|---|
| [`specs/`](specs/README.md) | Qué construimos y por qué. Decisiones de arquitectura con su justificación. | Antes de cambiar el diseño |
| [`plans/`](plans/README.md) | Cómo construirlo, tarea por tarea, con código y comandos exactos. | Al implementar |
| [`referencia/`](referencia/tienda-woocommerce.md) | Hechos verificados del entorno real y convenciones del proyecto. | Cuando algo no cuadra |

Cuatro archivos de referencia: [tienda WooCommerce](referencia/tienda-woocommerce.md) (cómo se comporta la tienda real), [entorno](referencia/entorno.md) (versiones y trampas de la máquina de desarrollo), [convenciones](referencia/convenciones.md) (capas, nombres, límites) y [errores conocidos](referencia/errores-conocidos.md) (búsqueda por mensaje de error exacto).

**Si algo falla y el mensaje es literal, empezá por [errores conocidos](referencia/errores-conocidos.md).**

## Estado

| Fase | Alcance | Estado |
|---|---|---|
| A | Pedidos de WooCommerce visibles en el dashboard | **Desplegada** — verificada con un pedido real |
| B | Agente que lee los correos del banco | **Desplegada** el 2026-09-14. `pg_cron` cada 5 min contra el buzón real |
| C | Conciliación automática pago ↔ pedido | **Desplegada** — matcher SQL con umbrales en `config` |
| D | Secciones "Revisar" y "Pagaron" | **Desplegada** — cuatro secciones en el dashboard |
| E | PWA instalable + notificaciones push de pago | **Implementada y verificada en local**, sin desplegar |

**El backend corre solo; el frontend todavía no está en Vercel.** Por eso la Fase E no puede probarse fuera de `pnpm build && pnpm preview`: un PWA se instala solo sobre HTTPS o localhost.

Detalle de cada fase en [`specs/07-fases.md`](specs/07-fases.md).

## Reglas que no se negocian

Estas tres aparecen repetidas en todo el repo porque romperlas cuesta plata real:

1. **WooCommerce nunca se escribe.** Entra por webhook y backfill; no sale nada hacia la tienda.
2. **El estado de pago vive en nuestra base, no en WooCommerce.** Se siembra desde Woo una sola vez, al insertar.
3. **El LLM extrae datos del correo. El LLM no decide qué pago corresponde a qué pedido.** Eso es una función SQL determinista.

Las justificaciones están en [`specs/03-principios.md`](specs/03-principios.md).
