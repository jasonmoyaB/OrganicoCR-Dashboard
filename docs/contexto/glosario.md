# Glosario

## Entidades (tablas)

| Tabla | Qué guarda | Clave de idempotencia |
|---|---|---|
| `pedidos` | Un pedido de la tienda WooCommerce, con su estado de cobro | `woo_order_id` |
| `webhook_eventos` | Bitácora cruda de todo lo que llega del webhook, firma inválida incluida | — (bitácora, solo insert) |
| `correos_banco` | El correo del banco tal cual llegó, para poder re-parsearlo | `mensaje_id` (header `Message-ID`) |
| `pagos` | La plata que entró, extraída de un correo. **Inmutable** | `mensaje_id` |
| `conciliaciones` | La propuesta "este pago cubre este pedido", con su score y desglose | `(pago_id, pedido_id)` |
| `config` | Umbrales, pesos y URLs. Se cambia sin redeploy | `clave` |
| `suscripciones_push` | Un navegador que quiere recibir avisos | `endpoint` |

## Estados

**`pedidos.estado_pago`** — nuestro, y el que manda:

| Valor | Significado | Sección del dashboard |
|---|---|---|
| `pendiente` | Debe | **Deben** |
| `revisar` | Hay un candidato sin certeza suficiente | **Revisar** |
| `pagado` | Conciliado, o marcado a mano | **Pagaron** |
| `anulado` | La tienda lo canceló, reembolsó o falló. No es deuda ni cobro | ninguna |

**`pedidos.estado_woo`** — lo que dice la tienda (`processing`, `on-hold`, `completed`, …). Informativo: se usa una sola vez, al insertar.

**`conciliaciones.estado`** — `sugerido` → `confirmado` | `descartado`.
**`conciliaciones.origen`** — `auto` (el matcher) | `manual` (el dueño desde "Revisar").

**`correos_banco.procesado_ok`** — `null` = capturado sin intentar extraer · `true` = se extrajo un pago o se descartó con motivo · `false` = **nadie supo leerlo**, y solo eso.

**Resultado de extracción** (`ResultadoExtraccion`) — `pago` | `no-aplica` (con `motivo`, p. ej. egreso o monto en dólares) | `desconocido`.

## Términos del dominio

| Término | Qué significa acá |
|---|---|
| **Conciliar** | Decidir que un pago del banco cubre un pedido concreto |
| **Matcher** | Las funciones SQL que puntúan y deciden: `candidatos_de_pago` (puntúa, no escribe) y `conciliar_pago` (decide y escribe) |
| **Score** | Número 0–1: qué tan convincente es que ese pago sea de ese pedido |
| **Desglose** | `jsonb` con los cuatro términos del score: `{monto, nombre, tiempo, referencia}`. Es lo que se le muestra al dueño para que decida en dos segundos |
| **Umbral auto** (`umbral_auto`, 0.85) | A partir de acá el matcher confirma solo |
| **Umbral revisar** (`umbral_revisar`, 0.55) | Debajo de acá ni se propone |
| **Margen de desempate** (`margen_desempate`, 0.05) | Si el segundo candidato queda más cerca que esto del primero, se sugiere en vez de confirmar |
| **Ventana** (`ventana_dias`, 7) | Días hacia atrás en que un pago puede corresponder a un pedido |
| **Referencia / motivo** | Lo que quien paga escribe al hacer el SINPE ("Verduras -87138944", "Cafe"). Es lo que más ayuda al matcher |
| **Remitente** | Quien mandó la plata. Davibank lo trae **truncado a 20 caracteres y con guiones bajos** (`MARIELLA_LO_VEGA`); el BAC no lo trae |
| **Cascarón** | Lo que el service worker cachea para que la app abra sin señal: `index.html`, iconos, logo. Nunca respuestas de Supabase |
| **Marcado a mano** | Un pedido `pagado` sin pago del banco detrás — lo marcó el dueño, o llegó de Woo ya en `completed` |
| **Cursor** | El último `uid_imap` leído del buzón. Solo se guarda si la corrida entera salió bien |
| **Backfill** | Traer el histórico de pedidos por la REST de Woo (`pnpm backfill`), fuera del webhook |

## Siglas y nombres propios

| Sigla | Qué es |
|---|---|
| **CRC / ₡** | Colón costarricense. Todo el sistema es CRC; los avisos en dólares se descartan |
| **SINPE Móvil** | Transferencia entre personas por número de teléfono. **El único método cuyo aviso trae el motivo escrito**, y por eso el único que puede auto-conciliarse |
| **Davibank** | `servicioalcliente@davibank.cr`. Tres redacciones de ingreso |
| **BAC** | BAC Credomatic, `notificaciones@baccredomatic.cr`. Cuatro redacciones. No dice quién mandó la plata |
| **Woo** | WooCommerce, la tienda |
| **RLS** | Row Level Security de Postgres. La protección real del sistema |
| **VAPID** | Par de llaves que firma los avisos Web Push. La mitad pública va en `VITE_VAPID_PUBLIC_KEY` |
| **HMAC** | Firma del cuerpo del webhook de Woo. Es lo único que autentica ese endpoint público |
| **Vault** | Donde vive la `service_role_key` que usan el cron y el trigger de push |
| **cPHulk** | El bloqueador de IPs del hosting. No bloquea a las Edge Functions: salen desde AWS |
| **Fases A–E** | A pedidos · B correo del banco · C matcher · D "Revisar"/"Pagaron" · E PWA y push |

## Personas

- **El dueño** — el único usuario del dashboard.
- **Hernán** — nombrado en `exportar-pagos.ts` como quien abre el reporte en Excel. [PENDIENTE: el repo no dice si es el dueño o el contador.]
