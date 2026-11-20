-- Refuerza el total de pedidos y habilita al panel para leer sus renglones.
-- Aplicable también al esquema ya vacío del entorno local.

create or replace function public.recalcular_total_pedido()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_id integer;
  v_new_id integer;
begin
  if tg_op <> 'INSERT' then
    v_old_id := old.id_pedido;
  end if;
  if tg_op <> 'DELETE' then
    v_new_id := new.id_pedido;
  end if;

  if v_old_id is not null then
    update public.pedidos p
       set total = coalesce((
         select sum(d.precio_unitario * d.cantidad)
         from public.detalle_pedido d
         where d.id_pedido = v_old_id
       ), 0)
     where p.id_pedido = v_old_id;
  end if;

  if v_new_id is not null and v_new_id is distinct from v_old_id then
    update public.pedidos p
       set total = coalesce((
         select sum(d.precio_unitario * d.cantidad)
         from public.detalle_pedido d
         where d.id_pedido = v_new_id
       ), 0)
     where p.id_pedido = v_new_id;
  elsif v_new_id is not null and tg_op = 'UPDATE' then
    update public.pedidos p
       set total = coalesce((
         select sum(d.precio_unitario * d.cantidad)
         from public.detalle_pedido d
         where d.id_pedido = v_new_id
       ), 0)
     where p.id_pedido = v_new_id;
  end if;

  return null;
end;
$$;

revoke all on function public.recalcular_total_pedido() from public, anon, authenticated;

drop trigger if exists trg_recalcular_total_pedido on public.detalle_pedido;
create trigger trg_recalcular_total_pedido
after insert or update or delete on public.detalle_pedido
for each row execute function public.recalcular_total_pedido();

grant select on public.detalle_pedido to authenticated;

-- Corrige filas históricas si la migración se aplica sobre datos existentes.
update public.pedidos p
set total = coalesce((
  select sum(d.precio_unitario * d.cantidad)
  from public.detalle_pedido d
  where d.id_pedido = p.id_pedido
), 0)
where p.total is distinct from coalesce((
  select sum(d.precio_unitario * d.cantidad)
  from public.detalle_pedido d
  where d.id_pedido = p.id_pedido
), 0);

-- Unidades de ítem para la lista del panel. La vista respeta las políticas RLS
-- de pedidos y detalle_pedido del usuario autenticado.
create or replace view public.v_pedidos_lista
with (security_invoker = true) as
select p.id_pedido, p.id_comercio, p.id_cliente, p.fecha_pedido,
       p.estado, p.total,
       coalesce(sum(d.cantidad), 0)::bigint as unidades
from public.pedidos p
left join public.detalle_pedido d on d.id_pedido = p.id_pedido
group by p.id_pedido;

grant select on public.v_pedidos_lista to authenticated;

-- Reactivación automática configurable. WF-11 invoca esta RPC de forma
-- periódica; la función manual del panel conserva su comportamiento.
alter table public.comercios
  add column if not exists reactivar_bot_min integer default 60;

alter table public.comercios
  drop constraint if exists comercios_reactivar_bot_min_check;

alter table public.comercios
  add constraint comercios_reactivar_bot_min_check
  check (reactivar_bot_min is null or reactivar_bot_min between 5 and 1440);

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
      -- Solo atenciones humanas reconocidas. Una alerta de no autorización
      -- nunca habilita la reactivación automática.
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

grant select on public.comercios to authenticated;
grant update (reactivar_bot_min) on public.comercios to authenticated;
