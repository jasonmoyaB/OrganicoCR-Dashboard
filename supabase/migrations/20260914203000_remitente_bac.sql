-- Suma el remitente real del BAC a los que `correo-poll` vigila.
--
-- D5 quedó cerrado leyendo el buzón: los avisos de transferencia del BAC llegan
-- de `notificaciones@baccredomatic.cr` y hay 205 en el histórico. Todavía no
-- existe un extractor para su plantilla, así que estos correos van a quedar en
-- `correos_banco` con `procesado_ok = false` — que es exactamente para lo que
-- se guarda el cuerpo crudo (P4): cuando el extractor exista, se re-parsea el
-- histórico sin volver a pedirle nada al servidor.
--
-- Dos remitentes que también escriben al buzón se dejan fuera a propósito:
--   * Alertas@davibank.cr          avisos de inicio de sesión, ~1500 correos de
--                                  puro ruido, nunca traen un monto
--   * facturaelectronica@baccredomatic.cr   facturas electrónicas con adjunto,
--                                  son gastos y no ingresos
update config
set valor = '["servicioalcliente@davibank.cr", "notificaciones@baccredomatic.cr"]'
where clave = 'remitentes_banco';
