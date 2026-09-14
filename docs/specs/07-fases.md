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
- Respaldo LLM para lo que el regex no reconozca

**No es Gmail.** El buzón es un Dovecot de cPanel y se lee por IMAP. La restricción [R2](02-restricciones.md) se corrigió con el hecho verificado.

**Capturar y extraer son dos pasos.** El correo crudo se guarda antes de parsearlo, así que un formato desconocido no se pierde: queda en `correos_banco` y se re-procesa cuando el extractor lo entienda. Eso es lo que permitió construir la fase sin tener todavía un correo real en la mano.

**Dos bancos, no uno.** Davibank (`servicioalcliente@davibank.cr`) ya tiene extractor; el BAC no, y sigue abierto como [D5](09-pendientes.md). El dispatcher es un map de handlers: sumarlo es una línea.

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
