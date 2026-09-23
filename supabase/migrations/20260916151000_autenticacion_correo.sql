-- Guardar lo que el servidor de correo dictaminó sobre cada aviso.
--
-- Hasta ahora, lo único que decía "esto vino del banco" era el header `From`,
-- que lo escribe quien manda. Un SINPE Móvil falsificado con el monto exacto y
-- el número de pedido en el motivo es justamente el caso que el matcher puede
-- auto-confirmar solo: el pedido queda cobrado sin que haya entrado un colón.
--
-- `Authentication-Results` (RFC 8601) lo pone el servidor que recibe. Se guarda
-- entero y sin interpretar: la decisión de qué hacer con él vive en el código y
-- puede cambiar, pero si no se guarda el texto original no hay forma de revisar
-- las decisiones viejas sin volver a bajar el correo.
--
-- Null tiene un significado y no es "falla": es que el correo se capturó antes
-- de esta migración, o que el servidor no agregó la cabecera. Distinguirlo de
-- un fallo real importa, porque descartar plata buena es el error caro.

alter table correos_banco add column if not exists autenticacion text;

comment on column correos_banco.autenticacion is
  'Header Authentication-Results tal como lo escribió el servidor receptor. Null = el correo es anterior a la verificación, o el servidor no lo agregó.';
