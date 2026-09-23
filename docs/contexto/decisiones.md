# Decisiones técnicas

Lo que se decidió, por qué, y qué se descartó. Todo detectado en el código, las migraciones y los commits.

## Dominio

**1. WooCommerce es solo lectura.** El webhook entra, el backfill lee, nada sale. *Por qué:* un bug nuestro no puede romper la tienda en producción. *Descartado:* escribir el estado de vuelta a Woo — no hay ni credenciales para hacerlo.

**2. `pedidos.estado_pago` es nuestro y manda; `estado_woo` es informativo.** Se deriva de Woo **una sola vez, al insertar** (`completed`→`pagado`, `cancelled`/`refunded`/`failed`→`anulado`, todo lo demás → `pendiente`). Un `pagado` nunca se degrada; la única excepción segura es `pendiente`→`anulado`. La regla vive en `upsert_pedido`, no en el código de app. *Por qué:* `processing` en la tienda no significa que la plata entró. *Descartado:* asumir pagado ante un estado desconocido — un pedido escondido no se descubre nunca.

**3. Montos como `bigint` en céntimos.** *Por qué:* el matcher compara por igualdad exacta y el float lo rompe de forma intermitente e irreproducible.

**4. Ingest idempotente por clave natural** (`woo_order_id`, `mensaje_id`, `endpoint`), nunca insert ciego. El payload crudo se guarda en `webhook_eventos` **antes** de procesarse, incluso con firma inválida, para poder re-procesar el histórico tras arreglar un bug de parseo.

**5. Los pagos son inmutables.** `UPDATE` revocado sobre la tabla **y** un trigger que lo rechaza también para la secret key. Si el parser mejora, se re-parsea desde `cuerpo_correo` y se crea una fila nueva.

**6. El LLM extrae; el LLM no concilia.** Qué pago corresponde a qué pedido es SQL determinista (`candidatos_de_pago` puntúa, `conciliar_pago` decide). *Por qué:* un falso positivo esconde plata sin cobrar para siempre; un falso negativo solo genera una fila en "Revisar". Los errores no son simétricos. *Estado:* hoy no hay LLM — los extractores son regex y reconocieron 57 de 57 correos reales.

**7. Los umbrales viven en la tabla `config`, no como constantes.** Se calibran cambiando una fila, sin redeploy.

**8. Tres frenos antes de auto-confirmar:** sin monto exacto no se confirma nunca; si el segundo candidato queda a menos de `margen_desempate` (0.05) se sugiere en vez de confirmar; el patrón de la referencia usa bordes de palabra (`\m`/`\M`) para que el "69" de un pedido no dé positivo dentro de "1069".

## Base de datos y seguridad

**Toda función nueva lleva DOS revokes.** Verificado el 2026-09-14: con solo el revoke de `PUBLIC`, `POST /rest/v1/rpc/conciliar_pago` con la publishable key devolvía **204** — la función `security definer` corría para cualquiera que abriera el bundle. Supabase otorga `EXECUTE` nominal a `anon`/`authenticated` por default privileges del esquema `public`, y el revoke de `PUBLIC` no toca esos grants.

**`resolver_conciliacion` es la única función con `grant execute ... to authenticated`.** Como es `security definer` y salta RLS, verifica `auth.uid()` a mano. *Por qué una función y no dos updates:* marcar el pedido `pagado` y que después el índice único rechace la conciliación dejaría un cobro sin pago que lo respalde.

**El 1:1 pago↔pedido lo impone la base**, con dos índices únicos parciales sobre `estado = 'confirmado'`, no el código de aplicación.

**Privilegio de columna, no policy, para limitar el `UPDATE` de `pedidos`.** Una policy no puede limitar columnas: `revoke update on pedidos from authenticated` + `grant update (estado_pago)`. Se corrigió en una migración nueva (`20260911205500`) sin tocar la original — regla: una migración aplicada no se edita.

**`correos_banco`, `config` y `webhook_eventos` con RLS activo y cero policies** (deny-all): los cuerpos de los correos nunca salen al navegador. El conteo para el cartel sale por RPC (`resumen_correos_sin_procesar`), que devuelve número y fecha, nada más.

**`search_path = public, pg_temp`, con `pg_temp` al final:** si va primero, una tabla temporal ajena le gana a la real.

## Correo

**IMAP en vez de la API de Gmail** (commit `0fff220`). El buzón `info@organicocr.store` es un Dovecot de cPanel en Bluehost, no Google Workspace. Se lee con `EXAMINE` y `BODY.PEEK` para no marcar nada como leído.

**`LOTE_MAXIMO = 50` por corrida.** El buzón tiene 13 015 mensajes y más de 1 700 avisos del banco: con el cursor en cero, la primera corrida intentaba bajarlos todos, se pasaba del timeout y —como el cursor solo se guarda si nada falla— reintentaba lo mismo cada 5 minutos sin avanzar nunca.

**Tres clases de resultado, no dos** (`pago` | `no-aplica` | `desconocido`). Antes, un egreso correctamente descartado y un formato ilegible caían los dos en `procesado_ok = false`, y el dashboard avisaba "47 correos sin procesar" con los 47 bien procesados. **Un aviso siempre encendido deja de avisar.**

**Un map de extractores por dirección de remitente, no un switch**: sumar un banco es agregar una línea sin tocar lo que ya funciona.

## Frontend

**Sin react-router, con cuatro secciones.** *Por qué:* dashboard de un solo usuario, sin enlaces que compartir. Lo que lo justificaría es querer volver a una sección tras recargar, no la cantidad. Lo que sí se agregó es leer `?seccion=` una vez al arrancar, para el atajo del icono instalado y el clic en la notificación — puerta de entrada, no ruteo.

**`refetchInterval: 60s` con `staleTime: 30s`, y `refetchIntervalInBackground: false`** (commit `refresco automatico`). Una pestaña abierta y quieta mostraba el estado de cuando se cargó. Con la pestaña oculta no se refresca: para eso está el push.

**Exportación a CSV armada en el navegador**, sin pasar por el servidor: los datos ya están en memoria y mandarlos de vuelta sería un viaje de ida y vuelta con datos personales sin ganancia.

**Zona horaria de Costa Rica como constante (`-6h`), no `Intl.DateTimeFormat`.** CR no usa horario de verano desde 1992, así que el resultado no depende del reloj de quien mira ni de la versión de ICU del navegador.

## PWA y push

**Los tres `sw*.js` en `/public`, no en `/src`.** El navegador identifica al worker por su URL: con hash del bundle, cada deploy instalaría un worker nuevo en vez de actualizar el que ya está. *Precio aceptado:* son los únicos archivos sin `oxlint` ni `tsc`.

**El worker solo se registra en producción** (`import.meta.env.PROD`): en `pnpm dev` un worker que cachea deja al navegador mostrando código viejo.

**Nada de Supabase se cachea**, solo el cascarón (`index.html`, iconos, logo) y los `/assets/*` con hash: servir una respuesta vieja de la API en un dashboard que dice quién debe plata es peor que no abrir.

**El trigger `pagos_avisan` nunca levanta excepción.** Todo es `raise warning` y el `net.http_post` va dentro de `exception when others`: quedarse sin aviso es molesto, perder el registro de plata que entró es el peor bug posible.

**`enviar-push` decodifica el bearer y exige `role = service_role`, sin compararlo contra `SUPABASE_SERVICE_ROLE_KEY`.** En producción ese valor no es el mismo string que el trigger saca de Vault, y la función le devolvía 401 a su propia base. Lee el payload sin verificar la firma, y eso solo vale porque `verify_jwt` sigue activo en el gateway.

**Una suscripción muerta se borra sola** (404/410 del servicio de push). Por eso no hay botón de "desactivar": el interruptor real está en los ajustes del navegador y la base se entera al siguiente pago.

**El permiso se pide con un clic, nunca al cargar:** un navegador que recibe el pedido sin interacción lo bloquea de por vida, y ese "no" no se deshace desde la página.

**Un aviso por cada pago nuevo**, diga lo que diga el matcher: avisar solo de lo que cae en "Revisar" dejaría pasar en silencio justo los pagos que sí cuadran.

## Decisiones abiertas

- **D2 / D3** — umbrales y ventana definitivos: se calibran con datos reales.
- **D4** — si se pide el # de pedido en el checkout de Woo: decisión del cliente.
- **D7** — si las empresas deben auto-conciliarse. Su techo de score es 0.80 contra un umbral de 0.85, porque las plantillas de transferencia y pago inmediato no traen motivo escrito por quien paga. Se arregla subiendo `peso_monto` en `config`, pero entonces dos pedidos del mismo monto el mismo día dejan de ser una moneda al aire y pasan a ser un cobro mal aplicado: **es decisión de riesgo del dueño, no del código**.
- **D8** — cuándo se despliega el frontend a Vercel. Bloquea el PWA: sin HTTPS no hay instalación ni push.
- **D6** — mover `pg_trgm` de `public` a `extensions`: hoy es peor negocio, el índice `gin_trgm_ops` podría dejar de usarse sin avisar.
