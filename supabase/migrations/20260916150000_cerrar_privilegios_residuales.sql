-- Los grants que Supabase da por default y que nadie usó nunca.
--
-- El esquema `public` otorga el juego completo a `anon` y `authenticated` en
-- cada tabla nueva. `pagos` fue la única que lo cerró en su momento; el resto
-- quedó con INSERT, UPDATE, DELETE y TRUNCATE puestos.
--
-- RLS tapa casi todo, pero no todo: **TRUNCATE es privilegio de tabla y RLS no
-- lo mira**. Hoy no es alcanzable porque PostgREST no lo expone y el registro
-- público está cerrado, así que esto es defensa en profundidad — el mismo
-- criterio que la migración de `pagos` ya había escrito.
--
-- Lo peor concreto: `pedidos` conservaba UPDATE de `anon` sobre TODAS las
-- columnas. La 20260911205500 revocó el de `authenticated` y dejó el de `anon`.
--
-- Lo que el dashboard usa de verdad, y que tiene que seguir funcionando:
--   pedidos             SELECT + UPDATE (estado_pago)
--   pagos               SELECT
--   conciliaciones      SELECT            (resolver pasa por la función)
--   suscripciones_push  SELECT + INSERT + UPDATE   (upsert por endpoint)
--   config, correos_banco, webhook_eventos   nada: deny-all

-- El SELECT se conserva a propósito, igual que en `pagos`: quien filtra la
-- lectura es RLS, y `anon` sin sesión ya recibe cero filas.
revoke insert, update, delete, truncate, references, trigger on pedidos
  from anon, authenticated;

-- Se repone después del revoke porque revocar UPDATE se lleva puesto el
-- privilegio de columna. Es la única escritura del dashboard sobre `pedidos`.
grant update (estado_pago) on pedidos to authenticated;

revoke references, trigger on conciliaciones from anon, authenticated;

-- Deny-all de verdad y no solo por RLS. Estas tres guardan la configuración del
-- matcher, los correos enteros del banco y los payloads crudos del webhook:
-- nada de eso tiene por qué ser alcanzable desde el navegador.
revoke all on config from anon, authenticated;
revoke all on correos_banco from anon, authenticated;
revoke all on webhook_eventos from anon, authenticated;

-- El navegador del dueño registra su propia suscripción con un upsert por
-- `endpoint`, así que necesita INSERT y UPDATE. Borrar no: una suscripción
-- muerta la borra `enviar-push` cuando el servicio de push contesta 404 o 410.
revoke all on suscripciones_push from anon;
revoke delete, truncate, references, trigger on suscripciones_push from authenticated;
