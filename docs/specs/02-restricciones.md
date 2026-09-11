« [Spec](README.md)

# 2. Restricciones

Decisiones ya cerradas con el cliente. No se re-litigan sin hablar con él.

## R1 — WooCommerce no se actualiza

El cliente confirmó que no necesita que el estado del pedido cambie en la tienda.

**Impacto:** flujo estrictamente unidireccional. Sin credenciales de escritura. Nuestra base es la única verdad del estado de pago. Ver [P1](03-principios.md).

## R2 — El correo del banco llega a Gmail / Google Workspace

**Impacto:** Gmail API con OAuth2 y refresh token. Sin IMAP, sin contraseñas almacenadas, scope `gmail.readonly`.

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
