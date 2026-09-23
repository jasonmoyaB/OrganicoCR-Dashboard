-- `enviar-push` le hace POST a lo que diga `suscripciones_push.endpoint`, y ese
-- valor lo escribe el navegador. Sin límite, alguien con sesión podía registrar
-- `http://kong:8000/rest/v1/` y hacer que la función pegara adentro de la red
-- de Supabase (SSRF). Verificado el 2026-09-23: el insert respondía 201.
--
-- Solo los servicios de push de los navegadores reales: Chrome/Edge (FCM),
-- Firefox, Safari/iOS y Windows. Las filas de producción del 2026-09-23 son de
-- Mozilla y Apple, así que el check entra sin romper ninguna.
-- ponytail: lista fija; si un navegador nuevo usa otro host, su suscripción
-- falla al guardarse y se agrega acá.
alter table suscripciones_push
  add constraint suscripciones_push_endpoint_conocido check (
    endpoint ~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)/'
  );
