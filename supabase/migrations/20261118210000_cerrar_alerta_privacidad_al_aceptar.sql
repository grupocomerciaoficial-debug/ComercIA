-- Al aceptar el tratamiento, se cierra la alerta creada por el rechazo previo
-- y se reactiva la conversación para que el cliente pueda continuar.

create or replace function public.registrar_autorizacion(
  p_comercio_id integer,
  p_wa_id text,
  p_decision text,
  p_version text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_alertas_cerradas integer := 0;
  v_conversaciones_reactivadas integer := 0;
begin
  if p_decision not in ('acepto', 'no_acepto') then
    raise exception 'decision_invalida';
  end if;

  insert into public.autorizaciones (id_comercio, wa_id, decision, version, fecha)
  values (p_comercio_id, p_wa_id, p_decision, p_version, now())
  on conflict (id_comercio, wa_id)
  do update set
    decision = excluded.decision,
    version = excluded.version,
    fecha = now();

  if p_decision = 'acepto' then
    update public.alertas
       set atendida = true,
           resuelta_en = now()
     where id_comercio = p_comercio_id
       and wa_id = p_wa_id
       and tipo in ('no_autorizo_tratamiento', 'sin_autorizacion')
       and not atendida;
    get diagnostics v_alertas_cerradas = row_count;

    update public.conversaciones c
       set pausada = false,
           estado_bot = 'MENU',
           subestado = null,
           intentos = 0
     where c.id_comercio = p_comercio_id
       and c.identificador_whatsapp = p_wa_id
       and c.pausada
       and not exists (
         select 1
           from public.alertas a
          where a.id_comercio = c.id_comercio
            and not a.atendida
            and (a.id_conversacion = c.id_conversacion
                 or a.wa_id = c.identificador_whatsapp)
       );
    get diagnostics v_conversaciones_reactivadas = row_count;
  end if;

  return jsonb_build_object(
    'ok', true,
    'alertas_cerradas', v_alertas_cerradas,
    'conversaciones_reactivadas', v_conversaciones_reactivadas
  );
end;
$$;

revoke all on function public.registrar_autorizacion(integer, text, text, text) from public, anon, authenticated;
grant execute on function public.registrar_autorizacion(integer, text, text, text) to service_role;

-- Corrige alertas pendientes de usuarios que ya habían aceptado antes de
-- aplicar esta migración. Conserva cualquier alerta distinta que siga abierta.
update public.alertas a
   set atendida = true,
       resuelta_en = now()
  from public.autorizaciones au
 where a.id_comercio = au.id_comercio
   and a.wa_id = au.wa_id
   and au.decision = 'acepto'
   and a.tipo in ('no_autorizo_tratamiento', 'sin_autorizacion')
   and not a.atendida;

update public.conversaciones c
   set pausada = false,
       estado_bot = 'MENU',
       subestado = null,
       intentos = 0
  from public.autorizaciones au
 where c.id_comercio = au.id_comercio
   and c.identificador_whatsapp = au.wa_id
   and au.decision = 'acepto'
   and c.pausada
   and not exists (
     select 1
       from public.alertas a
      where a.id_comercio = c.id_comercio
        and not a.atendida
        and (a.id_conversacion = c.id_conversacion
             or a.wa_id = c.identificador_whatsapp)
   );
