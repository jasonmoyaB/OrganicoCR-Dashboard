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

- OAuth2 con Gmail, refresh token en Vault
- Edge Function `gmail-poll` + job de `pg_cron`
- Filtro por remitente del banco. Todo lo demás se ignora
- Extractor regex con respaldo LLM
- Migración `pagos` con inmutabilidad
- Vista de pagos crudos en el dashboard — sirve para verificar que la extracción funciona antes de confiar en ella

**Bloqueo conocido:** hace falta ver correos reales del banco para escribir el regex. Ver [pendientes](09-pendientes.md).

**Alcance mayor al previsto inicialmente:** los pedidos usan tres métodos de pago manuales (`cod` renombrado "Sinpe Movil/Tarjeta", `bacs` transferencia, `cheque`), y ninguno permite deducir por qué vía entró la plata. El agente tiene que cubrir SINPE y transferencia bancaria por igual, no solo SINPE. Ver [referencia de la tienda](../referencia/tienda-woocommerce.md).

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

- Sección **"Revisar"**: conciliaciones sugeridas con su desglose de score visible. Confirmar o descartar con un clic
- Sección **"Pagaron"**: pedidos conciliados, con el pago que los respalda
- Opcional: magic links por WhatsApp/correo para confirmar matches ambiguos sin abrir el dashboard

---

« [Seguridad](06-seguridad.md) · [Pruebas →](08-pruebas.md)
