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
| `contexto/` | Resumen corto para un agente o dev nuevo: arquitectura, decisiones, glosario, flujo de trabajo | Primer día |
| `mockups/` | HTML con datos inventados para mostrarle al cliente algo antes de construirlo | Al cotizar |

Cuatro archivos de referencia: [tienda WooCommerce](referencia/tienda-woocommerce.md) (cómo se comporta la tienda real), [entorno](referencia/entorno.md) (versiones y trampas de la máquina de desarrollo), [convenciones](referencia/convenciones.md) (capas, nombres, límites) y [errores conocidos](referencia/errores-conocidos.md) (búsqueda por mensaje de error exacto).

**Si algo falla y el mensaje es literal, empezá por [errores conocidos](referencia/errores-conocidos.md).**

## Estado

| Fase | Alcance | Estado |
|---|---|---|
| A | Pedidos de WooCommerce visibles en el dashboard | **Desplegada** — verificada con un pedido real |
| B | Agente que lee los correos del banco | **Desplegada** el 2026-09-14. `pg_cron` cada 5 min contra el buzón real |
| C | Conciliación automática pago ↔ pedido | **Desplegada** — matcher SQL con umbrales en `config` |
| D | Secciones "Revisar" y "Pagaron" | **Desplegada** — cuatro secciones en el dashboard |
| E | PWA instalable + notificaciones push de pago | **Desplegada**. Hay un dispositivo suscrito; falta ver el primer aviso real en producción |
| — | Manejo de errores y alertas del servidor | **Hecho** el 2026-09-23: `explicarError`, `AvisoConexion`, `LimiteDeError`, 404, tabla `alertas_sistema` |
| F | Facturas de GTI, cuentas por cobrar, recordatorios | **Propuesta, no aprobada** — [spec](specs/10-fase-f-facturas.md) · [mockup opción B](mockups/opcion-b-por-cobrar.html) |
| G | Reenviar facturas de proveedores a `recepcion@facturaelectronica.cr` | **En prueba** — 38 filtros de cPanel creados el 2026-09-24, sin código. [Spec](specs/11-fase-g-mandarcorreos.md) |

**Backend y frontend corren en producción**: https://organico-cr-dashboard.vercel.app/. **Ningún pago se auto-confirma hoy**: el buzón de cPanel no escribe `Authentication-Results` con DMARC, así que todo pasa por "Revisar" (ver [D9](specs/09-pendientes.md)).

Detalle de cada fase en [`specs/07-fases.md`](specs/07-fases.md).

## ⚠️ IMPORTANTE: todo lo que se desarrolla se documenta

**Cada módulo, tarea, fix o decisión que se termina se documenta en el mismo cambio, no después.** Una tarea sin sus `.md` al día **no está terminada**, aunque el código funcione. Un doc viejo es peor que ninguno: alguien (persona o agente) le cree y rompe algo.

Qué actualizar según lo que se hizo:

| Si hiciste… | Actualizá |
|---|---|
| Un módulo, sección o Edge Function nueva | [`specs/07-fases.md`](specs/07-fases.md), [`specs/04-arquitectura.md`](specs/04-arquitectura.md), `contexto/arquitectura.md`, la tabla **Estado** de este archivo y `CLAUDE.md` |
| Una migración, tabla o función SQL | [`specs/05-datos.md`](specs/05-datos.md) y, si toca permisos, [`specs/06-seguridad.md`](specs/06-seguridad.md) |
| Un deploy o un cambio de estado de una fase | Tabla **Estado** de este archivo, `specs/07-fases.md`, `CLAUDE.md` |
| Una decisión cerrada o abierta con el cliente | [`specs/09-pendientes.md`](specs/09-pendientes.md) y `contexto/decisiones.md` |
| Un error raro que costó encontrar | [`referencia/errores-conocidos.md`](referencia/errores-conocidos.md) (con el mensaje literal) o [`referencia/entorno.md`](referencia/entorno.md) |
| Algo comprobado contra el sistema real | El doc que corresponda, **con la fecha** (`verificado el AAAA-MM-DD`) |

Al cerrar: `grep` en `docs/` por lo que cambiaste y corregí cada frase que quedó mentirosa ("todavía no", "pendiente", "sin desplegar").

## Reglas que no se negocian

Estas tres aparecen repetidas en todo el repo porque romperlas cuesta plata real:

1. **WooCommerce nunca se escribe.** Entra por webhook y backfill; no sale nada hacia la tienda.
2. **El estado de pago vive en nuestra base, no en WooCommerce.** Se siembra desde Woo una sola vez, al insertar.
3. **El LLM extrae datos del correo. El LLM no decide qué pago corresponde a qué pedido.** Eso es una función SQL determinista.

Las justificaciones están en [`specs/03-principios.md`](specs/03-principios.md).
