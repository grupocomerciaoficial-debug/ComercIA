-- WF-01 ya registra cada mensaje entrante con su Telegram message_id antes
-- de enrutarlo. WF-03 aún invoca esta RPC al detectar una pausa y la versión
-- anterior insertaba una segunda fila sin identificador. Mantener la firma
-- para que el flujo antiguo no falle, pero no volver a insertar el mensaje.
create or replace function public.registrar_mensaje_pausa(
  p_conversacion_id integer,
  p_contenido text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return jsonb_build_object('ok', true, 'registrado_por', 'wf01');
end;
$$;

revoke all on function public.registrar_mensaje_pausa(integer, text) from public, anon, authenticated;
grant execute on function public.registrar_mensaje_pausa(integer, text) to service_role;
