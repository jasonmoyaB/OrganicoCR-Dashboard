« [Spec](README.md)

# 3. Principios de arquitectura

Seis reglas. Explican la mayoría de las decisiones concretas del resto del spec. Si una implementación contradice alguna, la implementación está mal.

## P1 — WooCommerce es solo lectura

Nunca escribimos de vuelta a la tienda. El webhook entra, el backfill lee. Nada sale hacia Woo.

**Por qué:** un bug nuestro no puede romper la tienda en producción. Además elimina la necesidad de credenciales de escritura, que son el activo más peligroso del sistema.

## P2 — Postgres es la fuente de verdad del estado de pago

`pedidos.estado_woo` guarda lo que dice WooCommerce, como dato informativo. `pedidos.estado_pago` es nuestro, y es el que manda.

**Por qué:** hoy el cliente a veces marca pedidos como `processing` en Woo sin haber verificado el pago — exactamente el problema que venimos a resolver. Confiar en el estado de Woo sería importar el error.

**Excepción única, acotada:** al insertar un pedido por primera vez hay que sembrar *algún* valor. Ese primer valor se deriva de `estado_woo`. De ahí en adelante ningún update de Woo lo toca. Se confía en la tienda una vez, y nunca más. La regla vive en la función SQL `upsert_pedido`, no en el código de aplicación — ver [modelo de datos](05-datos.md).

## P3 — Ingest idempotente

WooCommerce reintenta webhooks ante cualquier respuesta que no sea 2xx, y puede entregar el mismo evento más de una vez. Todo ingest es `upsert` por clave natural (`woo_order_id` para pedidos, `mensaje_id` —el header `Message-ID`— para correos y pagos), nunca `insert` ciego.

Cada payload crudo se guarda en `webhook_eventos` **antes** de procesarse.

**Por qué:** permite re-procesar el histórico completo tras arreglar un bug de parseo, sin pedirle nada a WooCommerce ni al servidor de correo.

## P4 — Los pagos son inmutables

Una fila en `pagos` representa un hecho histórico: entró dinero. Se revoca `UPDATE` sobre la tabla.

Si el parser mejora, se re-parsea desde `cuerpo_correo` (que se guarda completo) y se crea una fila nueva. Nunca se sobrescribe un registro de dinero.

**Por qué:** auditabilidad. Un registro financiero que se puede editar en silencio no sirve como evidencia cuando hay una discrepancia con el cliente.

## P5 — La conciliación vive en su propia tabla, no en una columna

`conciliaciones` registra cada vínculo pago↔pedido con su score, el desglose de cómo se calculó, su origen (`auto` o `manual`) y quién lo confirmó.

**Por qué:**

- **Auditable** — se puede responder "¿por qué el sistema dijo que este pedido estaba pagado?"
- **Reversible** — descartar un match no destruye el pago.
- **Re-corrible** — al ajustar umbrales se recalculan los sugeridos sin tocar los confirmados.

## P6 — El LLM extrae. El LLM no concilia.

La extracción de monto y nombre desde el correo puede usar un modelo. **La decisión de qué pago corresponde a qué pedido es una función SQL determinista.**

**Por qué:** una alucinación en extracción produce un dato revisable que un humano detecta. Una alucinación en conciliación produce plata mal contada, silenciosamente. Además, una función determinista es testeable y re-ejecutable; un prompt no.

---

« [Restricciones](02-restricciones.md) · [Arquitectura →](04-arquitectura.md)
