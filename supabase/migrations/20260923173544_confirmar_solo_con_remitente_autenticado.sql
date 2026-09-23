-- Freno 3 del matcher: solo se auto-confirma lo que el banco probadamente mandó.
--
-- Hasta acá, un pago con monto exacto y referencia se confirmaba solo, sin
-- mirar de dónde venía. La auditoría del 2026-09-23 encontró dos caminos para
-- cobrar un pedido sin que entre un colón:
--
-- 1. El respaldo LLM. Un aviso inventado que el regex no reconoce iba al
--    modelo, y lo que el modelo leía se confirmaba igual que lo del regex. Eso
--    contradice la invariante 6: el LLM extrae, no concilia.
-- 2. Un SINPE Móvil falsificado con el `From` exacto de Davibank. La
--    verificación del remitente (20260916151000) solo descarta ante un
--    `dmarc=fail` explícito, y en producción el servidor de cPanel no escribe
--    `Authentication-Results`: los 7 correos capturados desde el 2026-09-16
--    tienen la columna en null. Hoy esa verificación nunca frena nada.
--
-- Los dos quedan como mucho en `sugerido`. Los errores no son simétricos:
-- confirmar de más esconde plata sin cobrar, quedarse corto solo pone una fila
-- en "Revisar". Mientras el servidor no escriba la cabecera, NINGÚN pago se
-- auto-confirma. Es el precio de no poder distinguir un aviso real de uno
-- falso.
--
-- El chequeo en SQL es más estricto que `veredictoDe` en TypeScript: exige
-- `dmarc=pass`, y un `dkim=pass` sin dmarc no alcanza. Si hay que equivocarse,
-- que sea hacia "Revisar". Se mira la PRIMERA aparición (`substring` devuelve
-- la primera coincidencia), igual que `leerCabeceras`: la cabecera que pone el
-- servidor receptor va arriba de cualquiera que traiga el atacante.
-- ponytail: si el servidor llega a escribir `Authentication-Results` en otro
-- formato, esto se queda en `sugerido` sin avisar; se ve como "todo va a Revisar".

create or replace function conciliar_pago(p_pago_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $funcion$
declare
  mejor       record;
  siguiente   numeric;
  decision    text;
  confiable   boolean;
begin
  if exists (select 1 from conciliaciones where pago_id = p_pago_id and estado = 'confirmado') then
    return;
  end if;

  select * into mejor from candidatos_de_pago(p_pago_id) limit 1;
  if mejor is null or mejor.score < leer_config_numero('umbral_revisar') then
    return;
  end if;

  select score into siguiente from candidatos_de_pago(p_pago_id) offset 1 limit 1;

  select pg.metodo_extraccion = 'regex'
     and coalesce(lower(substring(c.autenticacion from '(?i)\mdmarc\s*=\s*([a-z]+)')) = 'pass', false)
  into confiable
  from pagos pg
  join correos_banco c on c.id = pg.correo_id
  where pg.id = p_pago_id;

  decision := case
    -- Freno 1: sin monto exacto no se auto-confirma nunca. Freno 2: dos
    -- candidatos casi empatados son una moneda al aire. Freno 3: ni el LLM ni un
    -- remitente sin autenticar confirman solos.
    when mejor.score >= leer_config_numero('umbral_auto')
      and (mejor.desglose ->> 'monto')::numeric = 1
      and coalesce(mejor.score - siguiente, 1) >= leer_config_numero('margen_desempate')
      and coalesce(confiable, false)
    then 'confirmado'
    else 'sugerido'
  end;

  insert into conciliaciones (pago_id, pedido_id, score, desglose, origen, estado, confirmado_at)
  values (
    p_pago_id, mejor.pedido_id, mejor.score, mejor.desglose, 'auto', decision,
    case when decision = 'confirmado' then now() end
  )
  on conflict (pago_id, pedido_id) do nothing;

  update pedidos
  set estado_pago = case when decision = 'confirmado' then 'pagado' else 'revisar' end,
      updated_at = now()
  where id = mejor.pedido_id
    and estado_pago in ('pendiente', 'revisar')
    and (decision = 'sugerido' or exists (
      select 1 from conciliaciones
      where pago_id = p_pago_id and pedido_id = mejor.pedido_id and estado = 'confirmado'
    ));
end;
$funcion$;

revoke execute on function conciliar_pago(uuid) from public;
revoke execute on function conciliar_pago(uuid) from anon, authenticated;
