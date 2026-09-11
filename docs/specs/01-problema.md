« [Spec](README.md)

# 1. Problema y objetivo

## El problema

OrganicoCR vende por una tienda WordPress + WooCommerce. Los clientes pagan por transferencia SINPE a la cuenta bancaria del dueño. WooCommerce no se entera de esos pagos: la pasarela es manual.

Consecuencia: **el dueño no sabe quién pagó y quién no.** Hoy lo revisa cruzando a mano correos del banco contra pedidos de WooCommerce. No hay registro confiable de cobros pendientes.

El problema se agrava porque a veces marca pedidos como `processing` en la tienda sin haber verificado el pago — así que el estado de WooCommerce tampoco sirve como referencia.

## El objetivo

Dashboard donde el dueño ve, en una sola pantalla:

| Sección | Qué muestra |
|---|---|
| **Deben** | Pedidos sin pago confirmado, con el monto total pendiente |
| **Revisar** | Pagos que probablemente corresponden a un pedido, sin certeza suficiente. Confirmación de un clic |
| **Pagaron** | Pedidos conciliados contra una transferencia real |

El sistema lee los correos de notificación del banco, extrae monto y remitente, y los cruza contra los pedidos automáticamente.

## Qué no es

No es un reemplazo de WooCommerce ni una pasarela de pagos. No cobra, no factura, no toca la tienda. Es un espejo de solo lectura de los pedidos, cruzado contra un registro de pagos que arma por su cuenta.

---

« [Spec](README.md) · [Restricciones →](02-restricciones.md)
