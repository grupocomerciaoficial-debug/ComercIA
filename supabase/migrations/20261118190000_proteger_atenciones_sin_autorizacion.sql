-- WF-07 usa el tipo sin_autorizacion al rechazar el tratamiento.
-- Esa alerta nunca debe habilitar la reactivación automática.
create or replace function public.cerrar_atenciones_inactivas()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cerradas integer := 0;
  v_alertas integer := 0;
begin
  with vencidas as (
    select c.id_conversacion, c.id_comercio, c.identificador_whatsapp
    from public.conversaciones c
    join public.comercios co on co.id_comercio = c.id_comercio
    where c.pausada
      and co.reactivar_bot_min is not null
      and c.fecha_ultima_actividad <
          now() - make_interval(mins => co.reactivar_bot_min)
      and exists (
        select 1 from public.alertas a
        where a.id_comercio = c.id_comercio
          and (a.id_conversacion = c.id_conversacion
               or a.wa_id = c.identificador_whatsapp)
          and a.tipo not in ('no_autorizo_tratamiento', 'sin_autorizacion')
          and left(a.tipo, 10) <> 'solicitud_'
      )
      and not exists (
        select 1 from public.alertas a
        where a.id_comercio = c.id_comercio
          and (a.id_conversacion = c.id_conversacion
               or a.wa_id = c.identificador_whatsapp)
          and a.tipo in ('no_autorizo_tratamiento', 'sin_autorizacion')
      )
    for update of c skip locked
  ),
  reactivadas as (
    update public.conversaciones c
       set pausada = false, estado_bot = 'MENU', subestado = null, intentos = 0
      from vencidas v
     where c.id_conversacion = v.id_conversacion
    returning c.id_conversacion, c.id_comercio, c.identificador_whatsapp
  ),
  resueltas as (
    update public.alertas a
       set atendida = true, resuelta_en = now()
      from reactivadas r
     where a.id_comercio = r.id_comercio
       and not a.atendida
       and a.tipo not in ('no_autorizo_tratamiento', 'sin_autorizacion')
       and left(a.tipo, 10) <> 'solicitud_'
       and (a.id_conversacion = r.id_conversacion
            or a.wa_id = r.identificador_whatsapp)
    returning a.id
  )
  select (select count(*) from reactivadas),
         (select count(*) from resueltas)
    into v_cerradas, v_alertas;

  return json_build_object('ok', true, 'cerradas', v_cerradas, 'alertas_resueltas', v_alertas);
end;
$$;

revoke all on function public.cerrar_atenciones_inactivas() from public, anon, authenticated;
grant execute on function public.cerrar_atenciones_inactivas() to service_role;
