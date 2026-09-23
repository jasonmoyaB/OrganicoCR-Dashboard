# Invariantes del dominio — romperlas cuesta plata real

Justificación completa en `docs/specs/03-principios.md`. **Si una implementación
contradice alguna de estas, la implementación está mal**, por elegante que sea.
Un PR que viole una de estas se bloquea, no se comenta.

1. **WooCommerce es solo lectura.** El webhook entra, el backfill lee. Nada sale
   hacia la tienda. No hay credenciales de escritura. Cualquier `POST`/`PUT`
   hacia la API de Woo es un bloqueo inmediato.

2. **`pedidos.estado_pago` es nuestro y manda**; `estado_woo` es informativo.
   El estado inicial se deriva de Woo **una sola vez, al insertar**:
   `completed`→`pagado`, `cancelled`/`refunded`/`failed`→`anulado`, todo lo demás
   (incluido lo desconocido)→`pendiente`. Ningún `order.updated` lo vuelve a tocar.
   Única excepción, en la dirección segura: `pendiente` → `anulado` si la tienda
   lo anula. **Un `pagado` nunca se degrada.** La regla vive en la función SQL
   `upsert_pedido`, no en el código de aplicación: moverla al cliente es un hallazgo.

3. **Montos como entero en céntimos (`bigint`), nunca float.** El matching compara
   por igualdad exacta y el float lo rompe de forma intermitente e irreproducible.
   Todo en colones. `number` con decimales en un monto = bloqueo.

4. **Ingest idempotente**: upsert por clave natural (`woo_order_id`, `mensaje_id`),
   nunca insert ciego. El payload crudo se guarda en `webhook_eventos` **antes**
   de procesarse — incluso cuando la firma es inválida — para poder re-procesar el
   histórico tras arreglar un bug de parseo.

5. **Los pagos son inmutables.** `UPDATE` revocado sobre la tabla **y** un trigger
   `pagos_inmutables` que lo rechaza también para la secret key, que salta
   privilegios y RLS. Si el parser mejora, se re-parsea desde `cuerpo_correo` y se
   crea una **fila nueva**. Un PR que agregue un `update` sobre `pagos` está mal.

6. **El LLM extrae datos del correo. El LLM no concilia.** Qué pago corresponde a
   qué pedido es una función SQL determinista. Sin monto exacto, un candidato no
   puede superar `sugerido`.

7. **Una migración = un cambio atómico, y una migración aplicada no se edita nunca.**
   Lo que haya que corregir va en una migración nueva. Ver
   `20260911205500_endurecer_update_pedidos.sql`, que endurece la policy de la
   `182122` sin tocarla. **Un diff que modifica un archivo existente de
   `supabase/migrations/` es un bloqueo automático.**

8. **Los umbrales de matching viven en la tabla `config`, no como constantes**:
   se calibran cambiando una fila, sin redeploy. Un número mágico de scoring
   hardcodeado en SQL o TS es un hallazgo.

## Los tres frenos del matcher antes de auto-confirmar

Existen porque los errores no son simétricos:

1. Sin monto exacto no se confirma nunca, por alto que dé el resto.
2. Si el segundo candidato queda a menos de `margen_desempate` del primero, se
   sugiere: dos pedidos del mismo monto el mismo día son una moneda al aire.
3. El patrón de la referencia usa bordes de palabra (`\m`/`\M`); si no, el "69"
   de un pedido daría positivo dentro de "1069".

**Techo real del score para pagos de empresa: 0.80.** Transferencia SINPE y pago
inmediato no traen motivo escrito por quien paga, así que el término de 0.20 nunca
se activa y nunca llegan al umbral de 0.85. Caen siempre en "Revisar". Eso es
esperado, no un bug. Subir `peso_monto` es una decisión de riesgo del dueño.

## Flujo de estados de un pedido

Entra en **Deben** (`pendiente`) → el matcher lo manda a **Revisar** (`revisar`)
o directo a **Pagaron** (`pagado`) si auto-confirmó. En Revisar: confirmar lo cobra,
descartar lo devuelve a Deben — salvo que otra sugerencia siga viva, porque un
pedido sin candidatos no puede quedarse donde nadie lo mira.

Confirmar y descartar pasan por **`resolver_conciliacion(uuid, boolean)`**, no por
dos updates desde el cliente: marcar el pedido `pagado` y que después el índice
único rechace la conciliación dejaría un cobro sin pago que lo respalde.

"Pagaron" hace `left join` contra conciliaciones **a propósito**: un pedido puede
estar `pagado` sin pago del banco detrás (marcado a mano, o llegado de Woo ya
`completed`). Cambiarlo a `inner join` esconde pedidos y es un hallazgo.

## Extracción de correos del banco

- Davibank manda **tres** redacciones de ingreso; el BAC, cuatro. Viven en
  `supabase/functions/_extractor/plantillas-*.ts`.
- **La moneda escrita es obligatoria en el patrón**: Davibank avisa ingresos en
  dólares con la misma redacción, y leerlos como colones los haría cuadrar con el
  pedido equivocado.
- **El monto no puede terminar en separador**: va `[\d.,]*\d`, nunca `[\d.,]+`,
  porque el punto final de la oración se colaba y el normalizador rechazaba la
  cifra entera — el aviso se perdía sin dejar rastro.
- **El nombre del remitente viene truncado a 20 caracteres** y con guiones bajos
  (`DISTRIBUIDORA_AGROPE`): comparar por similitud, **nunca por igualdad**.
- **El BAC no dice quién mandó la plata**: `remitente_nombre` va en null y lo que
  identifica el pago es el concepto.
- `extraerPago` devuelve **tres** clases: `pago` | `no-aplica` | `desconocido`.
  `procesado_ok = false` significa una sola cosa: nadie supo leerlo. Un correo
  descartado con motivo **no** es un correo ilegible — mezclarlos volvió a encender
  un aviso permanente que dejó de avisar.
- Hay que descartar antes de buscar un cobro: `Envío exitoso de…`,
  `Recepción de débito…`, `debitando su cuenta`, cualquier monto en dólares, y
  `Devolución de crédito directo Entrante` — esta última trae un monto en CRC con
  la misma forma que un cobro y registraría plata que nunca entró.
- `LOTE_MAXIMO` en `correo-poll/index.ts` existe porque el buzón tiene 13 015
  mensajes: sin tope, la corrida se pasaba del timeout y, como el cursor solo se
  guarda si nada falla, reintentaba lo mismo cada 5 minutos sin avanzar nunca.
