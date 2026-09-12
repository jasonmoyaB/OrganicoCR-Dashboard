« [Spec](README.md)

# 2. Restricciones

Decisiones ya cerradas con el cliente. No se re-litigan sin hablar con él.

## R1 — WooCommerce no se actualiza

El cliente confirmó que no necesita que el estado del pedido cambie en la tienda.

**Impacto:** flujo estrictamente unidireccional. Sin credenciales de escritura. Nuestra base es la única verdad del estado de pago. Ver [P1](03-principios.md).

## R2 — El correo del banco llega a `info@organicocr.store`, por IMAP

**Corregida el 2026-09-12.** Decía *"llega a Gmail / Google Workspace"*, e implicaba Gmail API con OAuth2, sin IMAP y sin contraseñas almacenadas. La premisa resultó falsa: el dueño confirmó que `info@organicocr.store` es uno de los buzones que vinieron con el dominio, y el DNS lo respalda — el MX de prioridad 0 apunta a Bluehost, no a Google, y no hay SPF ni DKIM de Google. Ver [entorno](../referencia/entorno.md).

Esto no se re-litigó por preferencia: con Gmail fuera, la ruta OAuth no existía. `gmail.readonly` es un *restricted scope*, y sin Workspace la app queda en modo *Testing*, donde **el refresh token expira cada 7 días** — el agente dejaría de leer correo cada semana en silencio.

**El buzón no cambia.** Decisión explícita del dueño: los pagos llegan a `info@organicocr.store` y se lee ese, sin crear una dirección aparte ni reenviar a ningún lado.

**Impacto:** IMAP sobre TLS contra `mail.organicocr.store:993` (Dovecot, `AUTH=PLAIN`). Usuario y contraseña en los secretos de la Edge Function, nunca en el repo ni con prefijo `VITE_`.

El buzón se abre con `EXAMINE` y no con `SELECT`: es el modo de solo lectura del protocolo, así que el servidor rechaza cualquier intento de marcar leído o borrar. La credencial alcanza todo el buzón del negocio —ese es el costo de leer `info@` directamente— pero el código no puede modificarlo aunque un bug lo intente, y solo se descargan los correos cuyo remitente esté en `config.remitentes_banco`.

## R3 — Backend solo en Supabase

**Impacto:** Edge Functions (Deno) + `pg_cron` + Vault. Un proveedor, un set de secretos, una factura.

## R4 — Todo en colones

Sin ventas en dólares.

**Impacto:** una sola moneda, así que comparar montos por igualdad exacta es válido. Los montos se guardan como enteros en céntimos.

Dato del entorno real: WooCommerce devuelve los totales **sin decimales** (`"1965"`). Ver [referencia de la tienda](../referencia/tienda-woocommerce.md).

## R5 — Sin pagos parciales, sin pagos que cubran varios pedidos

Un pago corresponde a un pedido y a uno solo.

**Impacto:** relación pago↔pedido estrictamente 1:1, impuesta por índices únicos parciales en el esquema — no por código de aplicación. Ver [modelo de datos](05-datos.md).

## R6 — La referencia de pago es poco confiable

En el detalle SINPE, **a veces** el comprador escribe el número de factura. Generalmente no escribe nada.

**Impacto:** el matcher usa la referencia como señal fuerte cuando existe, y cae a scoring probabilístico cuando no. No se puede depender de ella.

Confirmado contra la tienda: el objeto `billing` de WooCommerce no tiene ningún campo de referencia de pago.

## R7 — Un solo usuario

El dueño. Credenciales fijas, sin registro ni gestión de usuarios.

**Impacto:** una fila creada a mano en Supabase Auth. Signup público deshabilitado. Sin recuperación de contraseña, sin roles, sin tabla de perfiles.

Por qué el usuario vive en Supabase Auth y no en el código: ver [seguridad](06-seguridad.md).

---

« [Problema](01-problema.md) · [Principios →](03-principios.md)
