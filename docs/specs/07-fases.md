« [Spec](README.md)

# 7. Fases

Cada fase es demostrable por sí sola. No se empieza la siguiente sin cerrar la anterior.

## Fase A — Pedidos visibles

**Entregable:** el dueño entra y ve sus pedidos pendientes reales, con el total que le deben.

- Migraciones `pedidos` y `webhook_eventos`, con RLS y `upsert_pedido`
- Edge Function `woo-webhook` con verificación HMAC
- Script de backfill histórico vía WooCommerce REST API
- App React + Vite con login
- Sección **"Deben"**: tabla de pedidos pendientes ordenada por antigüedad. Columnas: # pedido, cliente, monto, fecha, días transcurridos. Búsqueda y total pendiente destacado
- Acción manual "marcar pagado" — útil desde el día uno, antes de que exista automatización

**Sobre el filtro de estados:** se capturan **todos** los estados de WooCommerce y el filtrado ocurre en el dashboard. Adivinar cuál usa la tienda es la forma más fácil de perder pedidos en silencio.

**Punto de check-in con el cliente.** Ve progreso real antes de que empiece la parte invisible.

→ Plan detallado: [`plans/fase-a/`](../plans/fase-a/README.md)

## Fase B — Agente de correo

**Entregable:** los pagos del banco aparecen listados en el dashboard, todavía sin cruzarse con pedidos.

- Migración `correos_banco` + `pagos` (inmutable) + `config` — **hecha**
- Sección "Pagos" en el dashboard — **hecha**. Verifica que la extracción funciona antes de confiar en ella
- Extractor de Davibank con `normalizarMontoCRC` — **hecho**
- Edge Function `correo-poll`: IMAP de solo lectura contra `info@organicocr.store` — **hecha**
- Job de `pg_cron` cada 5 minutos — **hecho**. La service role key sale de Vault y la URL de `config`
- Extractor del BAC (`notificaciones@baccredomatic.cr`) — **hecho**. Cuatro redacciones
- Respaldo LLM para lo que el regex no reconozca — **pendiente, y ya no urge**: sobre 57 correos reales hubo 32 pagos, 25 descartados con motivo y **0 sin reconocer**

**No es Gmail.** El buzón es un Dovecot de cPanel y se lee por IMAP. La restricción [R2](02-restricciones.md) se corrigió con el hecho verificado.

**Capturar y extraer son dos pasos.** El correo crudo se guarda antes de parsearlo, así que un formato desconocido no se pierde: queda en `correos_banco` y se re-procesa cuando el extractor lo entienda. Eso es lo que permitió construir la fase sin tener todavía un correo real en la mano.

**Dos bancos, y los dos con extractor.** Davibank (`servicioalcliente@davibank.cr`) y BAC (`notificaciones@baccredomatic.cr`). [D5](09-pendientes.md) quedó cerrado el 2026-09-14. El dispatcher es un map de handlers.

**Lo que enseñó el buzón real, y que ninguna prueba sintética podía anticipar:**

- **Davibank manda tres redacciones de ingreso, no una.** El extractor conocía solo el SINPE Móvil y perdía **8 de 17 ingresos** de la muestra, uno de ₡377 742.
- **Los montos vienen en formato anglosajón** (`2,412.01`), al revés de lo que había descrito el dueño.
- **El monto no puede terminar en separador.** Con `[\d.,]+` el patrón se tragaba el punto final de la oración (`CRC 1,000,000.00.`) y el aviso se perdía sin dejar rastro. Va `[\d.,]*\d`.
- **El nombre viene truncado a 20 caracteres y con guiones bajos** (`DISTRIBUIDORA_AGROPE`), así que el matcher compara por similitud y nunca por igualdad.
- **El BAC no dice quién mandó la plata.** El único nombre del aviso es el del titular, o sea el propio dueño. `remitente_nombre` va en null y lo que identifica el pago es el concepto — por eso esos pagos no pasan de 0.75 y siempre caen en "Revisar".
- **El buzón tiene 13 015 mensajes y más de 1 700 avisos del banco.** Con el cursor en cero la primera corrida intentaba bajarlos todos, se pasaba del timeout y reintentaba lo mismo cada 5 minutos sin avanzar nunca. De ahí `LOTE_MAXIMO`.
- **Hay que descartar antes de buscar un cobro:** `Envío exitoso de…` y `Recepción de débito…` (Davibank), `debitando su cuenta` (BAC), cualquier monto en dólares, y `Devolución de crédito directo Entrante` — esta última trae un monto en CRC con la misma forma que un cobro, así que sin descartarla registraría plata que nunca entró.

## Fase C — Matching

**Entregable:** los pedidos con pago claro se marcan solos.

- `pg_trgm` habilitado
- Función de scoring en SQL + trigger
- Migración `conciliaciones` con los índices únicos parciales
- Tabla `config` con umbrales
- Job de recálculo para re-evaluar sugeridos cuando cambian los umbrales

**Se espera calibrar.** Los umbrales iniciales son una estimación. Se ajustan con datos reales de las primeras semanas.

## Fase D — Dashboard completo

**Entregable:** las tres secciones operativas.

- Sección **"Revisar"**: conciliaciones sugeridas con su desglose de score visible. Confirmar o descartar con un clic — **hecha**
- Sección **"Pagaron"**: pedidos conciliados, con el pago que los respalda — **hecha**
- Opcional: magic links por WhatsApp/correo para confirmar matches ambiguos sin abrir el dashboard — **no se hizo, y las notificaciones push de la Fase E lo reemplazan**

**"Pagaron" hace `left join` contra las conciliaciones a propósito.** Un pedido puede estar `pagado` sin pago del banco detrás —marcado a mano, o llegado de Woo ya en `completed`— y esconderlo haría que el dueño lo buscara donde ya no está. Esos salen como "marcado a mano".

**Sigue sin haber react-router.** Cuatro secciones no lo justifican: es un dashboard de un solo usuario, sin enlaces que compartir. Lo que sí se agregó es leer `?seccion=` **una vez, al arrancar**, para que el atajo del icono instalado y el clic en una notificación puedan abrir en "Pagos". Eso es una puerta de entrada, no ruteo: la sección nunca vuelve a tocar la barra de direcciones.

## Fase E — App instalable y avisos de pago

**Entregable:** el dueño instala el dashboard en el teléfono y le suena cuando entra un pago, con la app cerrada.

- `manifest.webmanifest` + iconos generados desde el logo de la tienda
- Service worker en tres archivos (`sw.js` de entrada, `sw-cache.js`, `sw-push.js`)
- Tabla `suscripciones_push` con sus cuatro policies
- Trigger `pagos_avisan` → `pg_net` → Edge Function `enviar-push` → Web Push cifrado
- Franja para pedir permiso, con un clic y nunca al cargar la página

**Un aviso por cada pago nuevo**, diga lo que diga el matcher. Es el comportamiento predecible: si entró plata, el dueño se entera. Avisar solo de lo que cae en "Revisar" dejaría pasar en silencio justo los pagos que sí cuadran.

**No se puede probar fuera de localhost hasta que el frontend se despliegue.** Un PWA se instala solo sobre HTTPS o localhost. En `pnpm dev` el worker ni se registra, a propósito: Vite sirve cada módulo por separado y un worker que cachea deja al navegador mostrando código viejo.

---

« [Seguridad](06-seguridad.md) · [Pruebas →](08-pruebas.md)
