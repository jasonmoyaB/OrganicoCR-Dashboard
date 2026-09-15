-- El aviso de "correos sin procesar" miraba el estado equivocado.
--
-- `contar_correos_sin_procesar` contaba `procesado_ok is null`, que es un
-- estado transitorio: dura lo que tarda la corrida que capturó el correo. El
-- caso que el aviso existe para mostrar —nadie supo leer el formato— se guarda
-- como `procesado_ok = false`, y era justo el que no contaba. Si un banco
-- cambiaba su plantilla, el dashboard se quedaba callado.
--
-- No se edita la 20260912110116, que ya está aplicada (invariante 7). La
-- función vieja se reemplaza por una que además dice desde cuándo: un número
-- solo no distingue "esto empezó hoy" de "esto lleva un mes".

drop function contar_correos_sin_procesar();

-- Solo el conteo y la fecha salen al frontend. Los cuerpos de los correos
-- llevan nombres y montos de terceros (Ley 8968) y el dashboard no los
-- necesita para nada.
create function resumen_correos_sin_procesar()
returns table (cantidad bigint, mas_viejo timestamptz)
language sql
security definer
set search_path = public, pg_temp
as $$
  select count(*), min(recibido_at)
  from correos_banco
  where auth.uid() is not null
    and (
      procesado_ok is false
      -- Un null recién capturado es normal y se resuelve solo: `correo-poll`
      -- lo recoge en la corrida siguiente. Recién si sobrevive tres corridas
      -- de cinco minutos significa que algo no lo deja terminar.
      or (procesado_ok is null and capturado_at < now() - interval '15 minutes')
    );
$$;

-- Los DOS revokes, y el grant después. Revocar solo de PUBLIC deja vivos los
-- grants nominales que Supabase le da a anon y authenticated por default
-- privileges del esquema public.
revoke execute on function resumen_correos_sin_procesar() from public;
revoke execute on function resumen_correos_sin_procesar() from anon, authenticated;
grant execute on function resumen_correos_sin_procesar() to authenticated;
