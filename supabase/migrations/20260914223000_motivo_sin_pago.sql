-- Distingue "este correo no es un cobro" de "este correo no se entendió".
--
-- Hasta ahora los dos caían en `procesado_ok = false`, y el aviso del
-- dashboard contaba los dos juntos: mostraba "47 correos sin procesar" cuando
-- los 47 estaban correctamente descartados —egresos y avisos en dólares—. Un
-- aviso que siempre está encendido deja de avisar.
--
-- A partir de acá `procesado_ok = false` significa solo una cosa: nadie supo
-- leer ese correo y alguien tiene que mirarlo.
alter table correos_banco add column motivo_sin_pago text;

comment on column correos_banco.motivo_sin_pago is
  'Por qué un correo reconocido no generó un pago (egreso, otra moneda). Null cuando sí lo generó o cuando no se reconoció el formato.';
