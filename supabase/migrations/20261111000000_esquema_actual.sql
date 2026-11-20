


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."direccion_mensaje" AS ENUM (
    'entrante',
    'saliente'
);


ALTER TYPE "public"."direccion_mensaje" OWNER TO "postgres";


CREATE TYPE "public"."estado_conversacion" AS ENUM (
    'activa',
    'cerrada'
);


ALTER TYPE "public"."estado_conversacion" OWNER TO "postgres";


CREATE TYPE "public"."estado_envio" AS ENUM (
    'recibido',
    'pendiente',
    'enviado',
    'entregado',
    'leido',
    'error'
);


ALTER TYPE "public"."estado_envio" OWNER TO "postgres";


CREATE TYPE "public"."estado_pedido" AS ENUM (
    'pendiente',
    'en_proceso',
    'completado',
    'cancelado',
    'confirmado'
);


ALTER TYPE "public"."estado_pedido" OWNER TO "postgres";


CREATE TYPE "public"."metodo_pago" AS ENUM (
    'efectivo',
    'transferencia',
    'tarjeta',
    'otro'
);


ALTER TYPE "public"."metodo_pago" OWNER TO "postgres";


CREATE TYPE "public"."rol_usuario" AS ENUM (
    'administrador',
    'vendedor'
);


ALTER TYPE "public"."rol_usuario" OWNER TO "postgres";


CREATE TYPE "public"."tipo_mensaje" AS ENUM (
    'texto',
    'imagen',
    'otro'
);


ALTER TYPE "public"."tipo_mensaje" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_conv"("p_comercio_id" integer, "p_wa_id" "text") RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
declare v_cli integer; v_conv integer;
begin
  select id_cliente into v_cli from public.clientes
   where id_comercio = p_comercio_id and telefono_whatsapp = p_wa_id limit 1;
  if v_cli is null then
    insert into public.clientes (id_comercio, nombre, telefono_whatsapp)
    values (p_comercio_id, 'Cliente Telegram', p_wa_id)
    returning id_cliente into v_cli;
  end if;
  select id_conversacion into v_conv from public.conversaciones
   where id_comercio = p_comercio_id and identificador_whatsapp = p_wa_id
     and estado = 'activa' order by id_conversacion desc limit 1;
  if v_conv is null then
    insert into public.conversaciones (id_comercio, id_cliente, identificador_whatsapp, estado)
    values (p_comercio_id, v_cli, p_wa_id, 'activa')
    returning id_conversacion into v_conv;
  end if;
  return v_conv;
end $$;


ALTER FUNCTION "public"."_conv"("p_comercio_id" integer, "p_wa_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_conv_id"("p_comercio_id" integer, "p_wa_id" "text") RETURNS integer
    LANGUAGE "sql" STABLE
    AS $$
  SELECT id_conversacion FROM public.conversaciones
  WHERE id_comercio=p_comercio_id AND identificador_whatsapp=p_wa_id
  ORDER BY fecha_ultima_actividad DESC NULLS LAST LIMIT 1 $$;


ALTER FUNCTION "public"."_conv_id"("p_comercio_id" integer, "p_wa_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_actualizar_comercio"("p_id" integer, "p_phone_number_id" "text", "p_activo" boolean) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
    if not public.es_plataforma() then
        raise exception 'sin_permiso' using errcode = '42501';
    end if;

    update public.comercios
    set phone_number_id = coalesce(p_phone_number_id, phone_number_id),
        activo = coalesce(p_activo, activo)
    where id_comercio = p_id;
    if not found then
        raise exception 'comercio_no_encontrado' using errcode = 'P0002';
    end if;

    insert into public.auditoria_admin (auth_user_id, accion, id_comercio, detalle)
    values (auth.uid(), 'actualizar_comercio', p_id,
            jsonb_build_object('phone_number_id', p_phone_number_id, 'activo', p_activo));

    return json_build_object('ok', true);
end
$$;


ALTER FUNCTION "public"."admin_actualizar_comercio"("p_id" integer, "p_phone_number_id" "text", "p_activo" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_listar_comercios"() RETURNS TABLE("id_comercio" integer, "nombre" character varying, "activo" boolean, "canal" "text", "phone_number_id" character varying, "productos" integer, "tiene_guia" boolean, "tiene_horario" boolean)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
    if not public.es_plataforma() then
        raise exception 'sin_permiso' using errcode = '42501';
    end if;

    return query
    select c.id_comercio, c.nombre, c.activo, c.canal, c.phone_number_id,
           (select count(*)::int from public.productos p where p.id_comercio = c.id_comercio and not p.eliminado),
           exists (select 1 from public.guias g where g.comercio_id = c.id_comercio and g.vigente),
           c.horario_atencion is not null
    from public.comercios c
    order by c.id_comercio;
end
$$;


ALTER FUNCTION "public"."admin_listar_comercios"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."agregar_items"("p_comercio_id" integer, "p_wa_id" "text", "p_items" "jsonb") RETURNS json
    LANGUAGE "plpgsql"
    AS $$
DECLARE v_items jsonb;
BEGIN
  INSERT INTO public.carritos(id_comercio,wa_id,items) VALUES (p_comercio_id,p_wa_id,COALESCE(p_items,'[]'::jsonb))
  ON CONFLICT (id_comercio,wa_id) DO UPDATE SET items=public.carritos.items||COALESCE(EXCLUDED.items,'[]'::jsonb), actualizado_en=now()
  RETURNING items INTO v_items;
  RETURN json_build_object('ok',true,'items',v_items);
END $$;


ALTER FUNCTION "public"."agregar_items"("p_comercio_id" integer, "p_wa_id" "text", "p_items" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."alternativas_categoria"("p_comercio_id" integer, "p_categoria" "text") RETURNS TABLE("nombre" character varying, "precio" numeric)
    LANGUAGE "sql" STABLE
    AS $$
  SELECT p.nombre, p.precio FROM public.productos p
  WHERE p.id_comercio=p_comercio_id AND p.disponible AND NOT p.eliminado AND p_categoria IS NOT NULL AND p.categoria=p_categoria
  ORDER BY p.nombre LIMIT 3 $$;


ALTER FUNCTION "public"."alternativas_categoria"("p_comercio_id" integer, "p_categoria" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calcular_resumen"("p_comercio_id" integer, "p_wa_id" "text") RETURNS json
    LANGUAGE "plpgsql" STABLE
    AS $_$
DECLARE v_car public.carritos; v_total numeric:=0; v_lineas text:=''; r record;
BEGIN
  SELECT * INTO v_car FROM public.carritos WHERE id_comercio=p_comercio_id AND wa_id=p_wa_id;
  IF NOT FOUND THEN RETURN json_build_object('total',0,'resumen_texto','Tu carrito está vacío.'); END IF;
  FOR r IN SELECT (i->>'cantidad')::int AS cant, p.nombre, p.precio, COALESCE(i->>'especificaciones','') AS esp
           FROM jsonb_array_elements(v_car.items) i
           JOIN public.productos p ON p.id_producto=(i->>'producto_id')::int AND p.id_comercio=p_comercio_id LOOP
    v_total := v_total + r.cant*r.precio;
    v_lineas := v_lineas || r.cant || ' x ' || r.nombre || CASE WHEN r.esp<>'' THEN ' ('||r.esp||')' ELSE '' END
                || ' - $' || to_char(r.cant*r.precio,'FM999G999G990') || E'\n';
  END LOOP;
  RETURN json_build_object('total',v_total,'resumen_texto','Resumen de tu pedido:'||E'\n'||v_lineas||'Total: $'||to_char(v_total,'FM999G999G990')||E'\n'
    ||'Entrega: '||COALESCE(v_car.entrega,'-')||COALESCE(' ('||v_car.direccion||')','')||E'\n'||'Pago: '||COALESCE(v_car.pago,'-'));
END $_$;


ALTER FUNCTION "public"."calcular_resumen"("p_comercio_id" integer, "p_wa_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cerrar_atenciones_inactivas"() RETURNS json
    LANGUAGE "plpgsql"
    AS $$
DECLARE v_n int;
BEGIN
  UPDATE public.conversaciones SET pausada=false, estado_bot='MENU' WHERE pausada AND fecha_ultima_actividad<now()-interval '24 hours';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN json_build_object('ok',true,'cerradas',v_n);
END $$;


ALTER FUNCTION "public"."cerrar_atenciones_inactivas"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."crear_alerta"("p_comercio_id" integer, "p_wa_id" "text", "p_tipo" "text", "p_con_contenido" boolean, "p_detalle" "text" DEFAULT NULL::"text") RETURNS json
    LANGUAGE "sql"
    AS $$
  INSERT INTO public.alertas (
    id_comercio, wa_id, tipo, con_contenido, detalle, id_conversacion
  )
  VALUES (
    p_comercio_id, p_wa_id, p_tipo, COALESCE(p_con_contenido, false), p_detalle,
    public._conv_id(p_comercio_id, p_wa_id)
  )
  RETURNING json_build_object('ok', true, 'id', id);
$$;


ALTER FUNCTION "public"."crear_alerta"("p_comercio_id" integer, "p_wa_id" "text", "p_tipo" "text", "p_con_contenido" boolean, "p_detalle" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."crear_pedido"("p_comercio_id" integer, "p_wa_id" "text", "p_idempotency_key" "text") RETURNS json
    LANGUAGE "plpgsql"
    AS $$
declare
    v_car public.carritos;
    v_cli int;
    v_conv int;
    v_ped int;
    v_total numeric;
begin
    select id_pedido, total into v_ped, v_total
    from public.pedidos where idempotency_key = p_idempotency_key;
    if found then
        return json_build_object('numero', v_ped, 'total', v_total, 'duplicado', true);
    end if;

    select * into v_car from public.carritos where id_comercio = p_comercio_id and wa_id = p_wa_id;
    if not found or jsonb_array_length(v_car.items) = 0 then
        return json_build_object('numero', null, 'error', 'carrito_vacio');
    end if;

    select id_cliente into v_cli from public.clientes
    where id_comercio = p_comercio_id and telefono_whatsapp = p_wa_id limit 1;
    if v_cli is null then
        insert into public.clientes (id_comercio, nombre, telefono_whatsapp, fecha_registro)
        values (p_comercio_id, v_car.nombre, p_wa_id, now())
        returning id_cliente into v_cli;
    elsif v_car.nombre is not null then
        update public.clientes set nombre = v_car.nombre where id_cliente = v_cli;
    end if;

    v_conv := public._conv_id(p_comercio_id, p_wa_id);

    insert into public.pedidos (id_comercio, id_cliente, id_conversacion, fecha_pedido, direccion_entrega,
                                tipo_entrega, metodo_pago, estado, total, cliente_wa_id, idempotency_key)
    values (p_comercio_id, v_cli, v_conv, now(),
            case when v_car.entrega = 'recogida' then 'Recogida en el local' else v_car.direccion end,
            case when v_car.entrega = 'recogida' then 'recogida' else 'domicilio' end,
            v_car.pago::public.metodo_pago, 'pendiente', 0, p_wa_id, p_idempotency_key)
    returning id_pedido into v_ped;

    insert into public.detalle_pedido (id_pedido, id_producto, cantidad, precio_unitario, nombre_producto, especificaciones)
    select v_ped, p.id_producto, (i ->> 'cantidad')::int, p.precio, p.nombre,
           nullif(left(coalesce(i ->> 'especificaciones', ''), 200), '')
    from jsonb_array_elements(v_car.items) i
    join public.productos p
      on p.id_producto = (i ->> 'producto_id')::int and p.id_comercio = p_comercio_id;

    select coalesce(sum(subtotal), 0) into v_total from public.detalle_pedido where id_pedido = v_ped;
    update public.pedidos set total = v_total where id_pedido = v_ped;

    delete from public.carritos where id = v_car.id;
    update public.conversaciones
    set estado_bot = 'MENU', subestado = null, fecha_ultima_actividad = now()
    where id_conversacion = v_conv;

    return json_build_object('numero', v_ped, 'total', v_total);
end
$$;


ALTER FUNCTION "public"."crear_pedido"("p_comercio_id" integer, "p_wa_id" "text", "p_idempotency_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."crear_solicitud"("p_comercio_id" integer, "p_wa_id" "text", "p_pedido_id" integer, "p_tipo" "text", "p_detalle" "text") RETURNS json
    LANGUAGE "plpgsql"
    AS $$
DECLARE v_id bigint;
BEGIN
  INSERT INTO public.solicitudes(id_comercio,pedido_id,wa_id,tipo,detalle) VALUES (p_comercio_id,p_pedido_id,p_wa_id,p_tipo,p_detalle) RETURNING id INTO v_id;
  PERFORM public.crear_alerta(p_comercio_id,p_wa_id,'solicitud_'||p_tipo,true,'Pedido #'||p_pedido_id||': '||COALESCE(p_detalle,''));
  RETURN json_build_object('ok',true,'id',v_id);
END $$;


ALTER FUNCTION "public"."crear_solicitud"("p_comercio_id" integer, "p_wa_id" "text", "p_pedido_id" integer, "p_tipo" "text", "p_detalle" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."datos_notificacion"("p_historial_id" bigint) RETURNS json
    LANGUAGE "sql" STABLE
    AS $$
  SELECT json_build_object(
    'pedido', json_build_object('id',p.id_pedido,'numero',p.id_pedido,
       'estado_nuevo', CASE h.estado_nuevo WHEN 'en_proceso' THEN 'procesado' ELSE h.estado_nuevo END,
       'resumen',(SELECT string_agg(d.cantidad||' x '||pr.nombre,', ') FROM public.detalle_pedido d
                  JOIN public.productos pr ON pr.id_producto=d.id_producto WHERE d.id_pedido=p.id_pedido),
       'entrega_detalle',COALESCE(p.direccion_entrega,'-'),'motivo',h.motivo,'total',p.total),
    'comercio', row_to_json(vc),
    'cliente', json_build_object('wa_id',COALESCE(p.cliente_wa_id,cl.telefono_whatsapp)))
  FROM public.historial_estados h JOIN public.pedidos p ON p.id_pedido=h.pedido_id
  JOIN public.v_comercios vc ON vc.id=p.id_comercio LEFT JOIN public.clientes cl ON cl.id_cliente=p.id_cliente
  WHERE h.id=p_historial_id $$;


ALTER FUNCTION "public"."datos_notificacion"("p_historial_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."descartar_carrito"("p_comercio_id" integer, "p_wa_id" "text") RETURNS json
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  DELETE FROM public.carritos WHERE id_comercio=p_comercio_id AND wa_id=p_wa_id;
  UPDATE public.conversaciones SET estado_bot='MENU', subestado=NULL, fecha_ultima_actividad=now() WHERE id_conversacion=public._conv_id(p_comercio_id,p_wa_id);
  RETURN json_build_object('ok',true);
END $$;


ALTER FUNCTION "public"."descartar_carrito"("p_comercio_id" integer, "p_wa_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."descartar_carritos_expirados"() RETURNS json
    LANGUAGE "plpgsql"
    AS $$
DECLARE v_n int;
BEGIN
  WITH borrados AS (DELETE FROM public.carritos WHERE actualizado_en<now()-interval '24 hours' RETURNING id_comercio,wa_id),
       upd AS (UPDATE public.conversaciones c SET estado_bot='MENU', subestado=NULL FROM borrados b
               WHERE c.id_comercio=b.id_comercio AND c.identificador_whatsapp=b.wa_id RETURNING 1)
  SELECT count(*) INTO v_n FROM borrados;
  RETURN json_build_object('ok',true,'descartados',v_n);
END $$;


ALTER FUNCTION "public"."descartar_carritos_expirados"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."es_plataforma"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    select exists (select 1 from public.admins_plataforma a where a.auth_user_id = auth.uid())
$$;


ALTER FUNCTION "public"."es_plataforma"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."guardar_dato"("p_comercio_id" integer, "p_wa_id" "text", "p_nombre" "text", "p_direccion" "text", "p_subestado" "text") RETURNS json
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE public.carritos SET nombre=p_nombre, direccion=p_direccion, actualizado_en=now() WHERE id_comercio=p_comercio_id AND wa_id=p_wa_id;
  PERFORM public.set_subestado(p_comercio_id,p_wa_id,p_subestado);
  RETURN json_build_object('ok',true);
END $$;


ALTER FUNCTION "public"."guardar_dato"("p_comercio_id" integer, "p_wa_id" "text", "p_nombre" "text", "p_direccion" "text", "p_subestado" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."guardar_entrega"("p_comercio_id" integer, "p_wa_id" "text", "p_entrega" "text") RETURNS json
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE public.carritos SET entrega=p_entrega, actualizado_en=now() WHERE id_comercio=p_comercio_id AND wa_id=p_wa_id;
  PERFORM public.set_subestado(p_comercio_id,p_wa_id,'datos');
  RETURN json_build_object('ok',true,'entrega',p_entrega);
END $$;


ALTER FUNCTION "public"."guardar_entrega"("p_comercio_id" integer, "p_wa_id" "text", "p_entrega" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."guardar_pago"("p_comercio_id" integer, "p_wa_id" "text", "p_pago" "text") RETURNS json
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE public.carritos SET pago=p_pago, actualizado_en=now() WHERE id_comercio=p_comercio_id AND wa_id=p_wa_id;
  PERFORM public.set_subestado(p_comercio_id,p_wa_id,'resumen');
  RETURN json_build_object('ok',true,'pago',p_pago);
END $$;


ALTER FUNCTION "public"."guardar_pago"("p_comercio_id" integer, "p_wa_id" "text", "p_pago" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."incrementar_intentos"("p_comercio_id" integer, "p_wa_id" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
declare v integer;
begin
  update public.conversaciones set intentos = intentos + 1
   where id_conversacion = public._conv(p_comercio_id, p_wa_id)
  returning intentos into v;
  return jsonb_build_object('intentos', v);
end $$;


ALTER FUNCTION "public"."incrementar_intentos"("p_comercio_id" integer, "p_wa_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."iniciar_pedido"("p_comercio_id" integer, "p_wa_id" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
begin
  update public.conversaciones set estado_bot = 'PEDIDO_ITEMS'
   where id_conversacion = public._conv(p_comercio_id, p_wa_id);
  return '{}'::jsonb;
end $$;


ALTER FUNCTION "public"."iniciar_pedido"("p_comercio_id" integer, "p_wa_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."listar_avisos_pendientes"() RETURNS TABLE("historial_id" bigint)
    LANGUAGE "sql" STABLE
    AS $$
  SELECT id FROM public.historial_estados
  WHERE aviso_intentos<5 AND creado_en>now()-interval '24 hours'
    AND (aviso_estado='no_enviado' OR (aviso_estado='pendiente' AND creado_en<now()-interval '10 minutes'))
  ORDER BY creado_en LIMIT 50 $$;


ALTER FUNCTION "public"."listar_avisos_pendientes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."marcar_aviso"("p_historial_id" bigint, "p_estado" "text") RETURNS json
    LANGUAGE "sql"
    AS $$
  UPDATE public.historial_estados SET aviso_estado=p_estado,
         aviso_intentos=aviso_intentos+CASE WHEN p_estado='no_enviado' THEN 1 ELSE 0 END
  WHERE id=p_historial_id RETURNING json_build_object('ok',true,'aviso_estado',aviso_estado) $$;


ALTER FUNCTION "public"."marcar_aviso"("p_historial_id" bigint, "p_estado" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mi_comercio"() RETURNS integer
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    select u.id_comercio
    from public.usuarios u
    where u.auth_user_id = auth.uid() and u.activo
    limit 1
$$;


ALTER FUNCTION "public"."mi_comercio"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."obtener_autorizacion"("p_comercio_id" integer, "p_wa_id" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
declare r public.autorizaciones;
begin
  select * into r from public.autorizaciones
   where id_comercio = p_comercio_id and wa_id = p_wa_id;
  if not found then return '{}'::jsonb; end if;
  return jsonb_build_object('decision', r.decision, 'version', r.version,
                            'version_vigente', (r.decision = 'acepto'),
                            'ultimo_aviso', r.ultimo_aviso);
end $$;


ALTER FUNCTION "public"."obtener_autorizacion"("p_comercio_id" integer, "p_wa_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."obtener_carrito"("p_comercio_id" integer, "p_wa_id" "text") RETURNS json
    LANGUAGE "plpgsql"
    AS $$
DECLARE v_car public.carritos; v_sub text;
BEGIN
  INSERT INTO public.carritos(id_comercio,wa_id) VALUES (p_comercio_id,p_wa_id) ON CONFLICT (id_comercio,wa_id) DO NOTHING;
  SELECT * INTO v_car FROM public.carritos WHERE id_comercio=p_comercio_id AND wa_id=p_wa_id;
  SELECT subestado INTO v_sub FROM public.conversaciones WHERE id_conversacion=public._conv_id(p_comercio_id,p_wa_id);
  RETURN json_build_object('carrito', json_build_object('items',v_car.items,'entrega',v_car.entrega,'nombre',v_car.nombre,
         'direccion',v_car.direccion,'pago',v_car.pago), 'subestado', COALESCE(v_sub,'items'));
END $$;


ALTER FUNCTION "public"."obtener_carrito"("p_comercio_id" integer, "p_wa_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."obtener_conversacion"("p_comercio_id" integer, "p_wa_id" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
declare v_conv integer; r public.conversaciones;
begin
  v_conv := public._conv(p_comercio_id, p_wa_id);
  select * into r from public.conversaciones where id_conversacion = v_conv;
  return jsonb_build_object('id', r.id_conversacion, 'estado', r.estado_bot,
                            'subestado', r.subestado, 'pausada', r.pausada,
                            'intentos', r.intentos);
end $$;


ALTER FUNCTION "public"."obtener_conversacion"("p_comercio_id" integer, "p_wa_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."panel_cambiar_estado"("p_pedido_id" integer, "p_estado" "text", "p_motivo" "text" DEFAULT NULL::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
    v_comercio int := public.mi_comercio();
    v_nuevo public.estado_pedido;
begin
    if v_comercio is null then
        raise exception 'sin_permiso' using errcode = '42501';
    end if;

    begin
        v_nuevo := p_estado::public.estado_pedido;
    exception when invalid_text_representation then
        raise exception 'estado_invalido' using errcode = 'P0001';
    end;

    perform 1 from public.pedidos where id_pedido = p_pedido_id and id_comercio = v_comercio for update;
    if not found then
        raise exception 'pedido_no_encontrado' using errcode = 'P0002';
    end if;

    perform set_config('app.usuario_id', auth.uid()::text, true);
    perform set_config('app.motivo', coalesce(p_motivo, ''), true);

    update public.pedidos set estado = v_nuevo where id_pedido = p_pedido_id;

    return json_build_object('ok', true, 'estado', v_nuevo);
end
$$;


ALTER FUNCTION "public"."panel_cambiar_estado"("p_pedido_id" integer, "p_estado" "text", "p_motivo" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."panel_finalizar_atencion"("p_conversacion_id" integer) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
    v_comercio int := public.mi_comercio();
    v_wa text;
begin
    if v_comercio is null then
        raise exception 'sin_permiso' using errcode = '42501';
    end if;

    select identificador_whatsapp into v_wa from public.conversaciones
    where id_conversacion = p_conversacion_id and id_comercio = v_comercio for update;
    if not found then
        raise exception 'conversacion_no_encontrada' using errcode = 'P0002';
    end if;

    update public.conversaciones
    set pausada = false, estado_bot = 'MENU', subestado = null, intentos = 0, fecha_ultima_actividad = now()
    where id_conversacion = p_conversacion_id;

    -- Los tipos de alerta de atención humana los define n8n. [N8N]
    update public.alertas
    set atendida = true, resuelta_por = auth.uid(), resuelta_en = now()
    where id_comercio = v_comercio
      and not atendida
      and tipo not in ('no_autorizo_tratamiento')
      and left(tipo, 10) <> 'solicitud_'
      and (id_conversacion = p_conversacion_id or wa_id = v_wa);

    return json_build_object('ok', true);
end
$$;


ALTER FUNCTION "public"."panel_finalizar_atencion"("p_conversacion_id" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."panel_marcar_alerta_atendida"("p_alerta_id" bigint) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
    v_comercio int := public.mi_comercio();
begin
    if v_comercio is null then
        raise exception 'sin_permiso' using errcode = '42501';
    end if;

    update public.alertas
    set atendida = true, resuelta_por = auth.uid(), resuelta_en = now()
    where id = p_alerta_id and id_comercio = v_comercio and not atendida;
    if not found then
        raise exception 'alerta_no_encontrada' using errcode = 'P0002';
    end if;

    return json_build_object('ok', true);
end
$$;


ALTER FUNCTION "public"."panel_marcar_alerta_atendida"("p_alerta_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."panel_resolver_solicitud"("p_solicitud_id" bigint, "p_decision" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
    v_comercio int := public.mi_comercio();
    v_sol public.solicitudes;
    v_estado_pedido public.estado_pedido;
begin
    if v_comercio is null then
        raise exception 'sin_permiso' using errcode = '42501';
    end if;
    if p_decision not in ('aceptada', 'rechazada') then
        raise exception 'decision_invalida' using errcode = 'P0001';
    end if;

    select * into v_sol from public.solicitudes
    where id = p_solicitud_id and id_comercio = v_comercio for update;
    if not found then
        raise exception 'solicitud_no_encontrada' using errcode = 'P0002';
    end if;
    if v_sol.estado <> 'pendiente' then
        raise exception 'solicitud_ya_resuelta' using errcode = 'P0001';
    end if;

    -- Aceptar una modificación solo marca la solicitud como atendida;
    -- aceptar una cancelación cancela el pedido si todavía es posible.
    if p_decision = 'aceptada' and v_sol.tipo = 'cancelacion' then
        select estado into v_estado_pedido from public.pedidos where id_pedido = v_sol.pedido_id;
        if v_estado_pedido <> 'cancelado' then
            perform public.panel_cambiar_estado(v_sol.pedido_id, 'cancelado', 'Cancelado a solicitud del cliente');
        end if;
    end if;

    update public.solicitudes
    set estado = p_decision, resuelta_por = auth.uid(), resuelta_en = now()
    where id = p_solicitud_id;

    update public.alertas
    set atendida = true, resuelta_por = auth.uid(), resuelta_en = now()
    where id_comercio = v_comercio
      and wa_id = v_sol.wa_id
      and tipo = 'solicitud_' || v_sol.tipo
      and not atendida
      and detalle like 'Pedido #' || v_sol.pedido_id::text || ':%';

    return json_build_object('ok', true, 'decision', p_decision, 'avisar_cliente', true);
end
$$;


ALTER FUNCTION "public"."panel_resolver_solicitud"("p_solicitud_id" bigint, "p_decision" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."pausar_conversacion"("p_comercio_id" integer, "p_wa_id" "text", "p_tipo" "text") RETURNS json
    LANGUAGE "sql"
    AS $$
  UPDATE public.conversaciones SET pausada=true, estado_bot='HUMANO', fecha_ultima_actividad=now()
  WHERE id_conversacion=public._conv_id(p_comercio_id,p_wa_id)
  RETURNING json_build_object('ok',true,'conversacion_id',id_conversacion,'motivo',p_tipo) $$;


ALTER FUNCTION "public"."pausar_conversacion"("p_comercio_id" integer, "p_wa_id" "text", "p_tipo" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."registrar_autorizacion"("p_comercio_id" integer, "p_wa_id" "text", "p_decision" "text", "p_version" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
begin
  insert into public.autorizaciones (id_comercio, wa_id, decision, version, fecha)
  values (p_comercio_id, p_wa_id, p_decision, p_version, now())
  on conflict (id_comercio, wa_id)
  do update set decision = excluded.decision, version = excluded.version, fecha = now();
  return '{}'::jsonb;
end $$;


ALTER FUNCTION "public"."registrar_autorizacion"("p_comercio_id" integer, "p_wa_id" "text", "p_decision" "text", "p_version" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."registrar_aviso_enviado"("p_comercio_id" integer, "p_wa_id" "text", "p_version" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
begin
  insert into public.autorizaciones (id_comercio, wa_id, version, ultimo_aviso)
  values (p_comercio_id, p_wa_id, p_version, now())
  on conflict (id_comercio, wa_id)
  do update set ultimo_aviso = now(), version = excluded.version;
  return '{}'::jsonb;
end $$;


ALTER FUNCTION "public"."registrar_aviso_enviado"("p_comercio_id" integer, "p_wa_id" "text", "p_version" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."registrar_mensaje_entrante"("p_comercio_id" integer, "p_wa_id" "text", "p_tipo" "text", "p_wa_message_id" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
declare v_conv integer; v_id bigint; v_tipo public.tipo_mensaje;
begin
  if exists (select 1 from public.mensajes
             where identificador_mensaje_whatsapp = p_wa_message_id) then
    return '{}'::jsonb;
  end if;
  v_conv := public._conv(p_comercio_id, p_wa_id);
  v_tipo := case when p_tipo = 'texto' then 'texto'
                 when p_tipo = 'photo' then 'imagen'
                 else 'otro' end;
  insert into public.mensajes (id_conversacion, direccion, contenido, tipo_mensaje,
                               identificador_mensaje_whatsapp, estado_envio)
  values (v_conv, 'entrante', '', v_tipo, p_wa_message_id, 'recibido')
  returning id_mensaje into v_id;
  update public.conversaciones set fecha_ultima_actividad = now() where id_conversacion = v_conv;
  return jsonb_build_object('id', v_id, 'id_conversacion', v_conv);
end $$;


ALTER FUNCTION "public"."registrar_mensaje_entrante"("p_comercio_id" integer, "p_wa_id" "text", "p_tipo" "text", "p_wa_message_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."registrar_mensaje_entrante_con_contenido"("p_comercio_id" integer, "p_wa_id" "text", "p_tipo" "text", "p_wa_message_id" "text", "p_contenido" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_conv integer;
  v_id bigint;
  v_tipo public.tipo_mensaje;
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.mensajes
    WHERE identificador_mensaje_whatsapp = p_wa_message_id
  ) THEN
    RETURN '{}'::jsonb;
  END IF;

  v_conv := public._conv(p_comercio_id, p_wa_id);
  v_tipo := CASE
    WHEN p_tipo = 'texto' THEN 'texto'::public.tipo_mensaje
    WHEN p_tipo = 'photo' THEN 'imagen'::public.tipo_mensaje
    ELSE 'otro'::public.tipo_mensaje
  END;

  INSERT INTO public.mensajes (
    id_conversacion,
    direccion,
    contenido,
    tipo_mensaje,
    identificador_mensaje_whatsapp,
    estado_envio
  )
  VALUES (
    v_conv,
    'entrante',
    COALESCE(NULLIF(btrim(p_contenido), ''), '[Mensaje sin texto]'),
    v_tipo,
    p_wa_message_id,
    'recibido'
  )
  RETURNING id_mensaje INTO v_id;

  UPDATE public.conversaciones
  SET fecha_ultima_actividad = now()
  WHERE id_conversacion = v_conv;

  RETURN jsonb_build_object('id', v_id, 'id_conversacion', v_conv);
END;
$$;


ALTER FUNCTION "public"."registrar_mensaje_entrante_con_contenido"("p_comercio_id" integer, "p_wa_id" "text", "p_tipo" "text", "p_wa_message_id" "text", "p_contenido" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."registrar_mensaje_pausa"("p_conversacion_id" integer, "p_contenido" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
begin
  insert into public.mensajes (id_conversacion, direccion, contenido, tipo_mensaje, estado_envio)
  values (p_conversacion_id, 'entrante', coalesce(p_contenido, ''), 'texto', 'recibido');
  return '{}'::jsonb;
end $$;


ALTER FUNCTION "public"."registrar_mensaje_pausa"("p_conversacion_id" integer, "p_contenido" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."registrar_mensaje_saliente"("p_comercio_id" integer, "p_wa_id" "text", "p_autor" "text", "p_contenido" "text", "p_wa_message_id" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
declare v_conv integer; v_id bigint;
begin
  v_conv := public._conv(p_comercio_id, p_wa_id);
  insert into public.mensajes (id_conversacion, direccion, contenido, tipo_mensaje,
                               identificador_mensaje_whatsapp, estado_envio)
  values (v_conv, 'saliente', coalesce(p_contenido, ''), 'texto', p_wa_message_id, 'enviado')
  returning id_mensaje into v_id;
  return jsonb_build_object('id', v_id);
end $$;


ALTER FUNCTION "public"."registrar_mensaje_saliente"("p_comercio_id" integer, "p_wa_id" "text", "p_autor" "text", "p_contenido" "text", "p_wa_message_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reiniciar_estado"("p_comercio_id" integer, "p_wa_id" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
begin
  update public.conversaciones
     set estado_bot = 'MENU', subestado = null, intentos = 0
   where id_conversacion = public._conv(p_comercio_id, p_wa_id);
  return '{}'::jsonb;
end $$;


ALTER FUNCTION "public"."reiniciar_estado"("p_comercio_id" integer, "p_wa_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_estado"("p_comercio_id" integer, "p_wa_id" "text", "p_estado" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
begin
  update public.conversaciones set estado_bot = p_estado
   where id_conversacion = public._conv(p_comercio_id, p_wa_id);
  return '{}'::jsonb;
end $$;


ALTER FUNCTION "public"."set_estado"("p_comercio_id" integer, "p_wa_id" "text", "p_estado" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_fecha_ultima_actividad"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.fecha_ultima_actividad := now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_fecha_ultima_actividad"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_subestado"("p_comercio_id" integer, "p_wa_id" "text", "p_subestado" "text") RETURNS json
    LANGUAGE "sql"
    AS $$
  UPDATE public.conversaciones SET subestado=p_subestado, fecha_ultima_actividad=now()
  WHERE id_conversacion=public._conv_id(p_comercio_id,p_wa_id)
  RETURNING json_build_object('ok',true,'subestado',subestado) $$;


ALTER FUNCTION "public"."set_subestado"("p_comercio_id" integer, "p_wa_id" "text", "p_subestado" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tg_historial_inmutable"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
    if tg_op = 'DELETE' then
        raise exception 'historial_inmutable';
    end if;
    if new.pedido_id is distinct from old.pedido_id
        or new.estado_anterior is distinct from old.estado_anterior
        or new.estado_nuevo is distinct from old.estado_nuevo
        or new.motivo is distinct from old.motivo
        or new.usuario_id is distinct from old.usuario_id
        or new.creado_en is distinct from old.creado_en then
        raise exception 'historial_inmutable';
    end if;
    return new;
end
$$;


ALTER FUNCTION "public"."tg_historial_inmutable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tg_pedidos_historial"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
    v_usuario uuid;
    v_motivo text;
begin
    if new.estado is distinct from old.estado then
        v_usuario := nullif(current_setting('app.usuario_id', true), '')::uuid;
        v_motivo := nullif(current_setting('app.motivo', true), '');
        insert into public.historial_estados (pedido_id, estado_anterior, estado_nuevo, motivo, usuario_id)
        values (new.id_pedido, old.estado::text, new.estado::text, v_motivo, v_usuario);
    end if;
    return new;
end
$$;


ALTER FUNCTION "public"."tg_pedidos_historial"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tg_pedidos_validar_estado"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
    if new.estado is distinct from old.estado then
        if not (
            (old.estado = 'pendiente' and new.estado in ('en_proceso', 'confirmado', 'cancelado'))
            or (old.estado = 'en_proceso' and new.estado in ('confirmado', 'cancelado'))
            or (old.estado = 'confirmado' and new.estado = 'cancelado')
        ) then
            raise exception 'transicion_invalida: % -> %', old.estado, new.estado using errcode = 'P0001';
        end if;
    end if;
    return new;
end
$$;


ALTER FUNCTION "public"."tg_pedidos_validar_estado"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ultimo_cliente_sin_respuesta"("p_comercio_id" integer) RETURNS json
    LANGUAGE "sql" STABLE
    AS $$
  SELECT json_build_object('wa_id',c.identificador_whatsapp,'phone_number_id',vc.phone_number_id)
  FROM public.conversaciones c JOIN public.v_comercios vc ON vc.id=c.id_comercio
  WHERE c.id_comercio=p_comercio_id AND c.fecha_ultima_actividad>now()-interval '30 minutes'
    AND EXISTS (SELECT 1 FROM public.mensajes m WHERE m.id_conversacion=c.id_conversacion AND m.direccion='entrante'
                AND m.fecha_mensaje>COALESCE((SELECT max(s.fecha_mensaje) FROM public.mensajes s
                    WHERE s.id_conversacion=c.id_conversacion AND s.direccion='saliente'),'-infinity'::timestamptz))
  ORDER BY c.fecha_ultima_actividad DESC LIMIT 1 $$;


ALTER FUNCTION "public"."ultimo_cliente_sin_respuesta"("p_comercio_id" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."verificar_propiedad_conversacion"("p_user_id" "uuid", "p_conversacion_id" integer) RETURNS json
    LANGUAGE "plpgsql" STABLE
    AS $$
DECLARE r record;
BEGIN
  SELECT c.id_comercio, vc.phone_number_id, c.identificador_whatsapp INTO r
  FROM public.conversaciones c
  JOIN public.usuarios u ON u.id_comercio=c.id_comercio AND u.auth_user_id=p_user_id AND u.activo
  JOIN public.v_comercios vc ON vc.id=c.id_comercio
  WHERE c.id_conversacion=p_conversacion_id;
  IF NOT FOUND THEN RETURN json_build_object('permitido',false); END IF;
  RETURN json_build_object('permitido',true,'comercio_id',r.id_comercio,'phone_number_id',r.phone_number_id,'wa_id',r.identificador_whatsapp);
END $$;


ALTER FUNCTION "public"."verificar_propiedad_conversacion"("p_user_id" "uuid", "p_conversacion_id" integer) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."admins_plataforma" (
    "auth_user_id" "uuid" NOT NULL,
    "nombre" "text" NOT NULL,
    "creado_en" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."admins_plataforma" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."alertas" (
    "id" bigint NOT NULL,
    "id_comercio" integer,
    "wa_id" "text",
    "tipo" "text" NOT NULL,
    "con_contenido" boolean DEFAULT false NOT NULL,
    "detalle" "text",
    "atendida" boolean DEFAULT false NOT NULL,
    "creado_en" timestamp with time zone DEFAULT "now"() NOT NULL,
    "id_conversacion" integer,
    "resuelta_por" "uuid",
    "resuelta_en" timestamp with time zone
);


ALTER TABLE "public"."alertas" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."alertas_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."alertas_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."alertas_id_seq" OWNED BY "public"."alertas"."id";



CREATE TABLE IF NOT EXISTS "public"."auditoria_admin" (
    "id" bigint NOT NULL,
    "auth_user_id" "uuid",
    "accion" "text" NOT NULL,
    "id_comercio" integer,
    "detalle" "jsonb",
    "creado_en" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."auditoria_admin" OWNER TO "postgres";


ALTER TABLE "public"."auditoria_admin" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."auditoria_admin_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."autorizaciones" (
    "id" bigint NOT NULL,
    "id_comercio" integer NOT NULL,
    "wa_id" "text" NOT NULL,
    "decision" "text",
    "version" "text",
    "ultimo_aviso" timestamp with time zone,
    "fecha" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."autorizaciones" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."autorizaciones_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."autorizaciones_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."autorizaciones_id_seq" OWNED BY "public"."autorizaciones"."id";



CREATE TABLE IF NOT EXISTS "public"."carritos" (
    "id" bigint NOT NULL,
    "id_comercio" integer NOT NULL,
    "wa_id" "text" NOT NULL,
    "items" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "entrega" "text",
    "nombre" "text",
    "direccion" "text",
    "pago" "text",
    "actualizado_en" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."carritos" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."carritos_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."carritos_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."carritos_id_seq" OWNED BY "public"."carritos"."id";



CREATE TABLE IF NOT EXISTS "public"."clientes" (
    "id_cliente" integer NOT NULL,
    "id_comercio" integer NOT NULL,
    "nombre" character varying(120),
    "telefono_whatsapp" character varying(20) NOT NULL,
    "fecha_registro" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."clientes" OWNER TO "postgres";


ALTER TABLE "public"."clientes" ALTER COLUMN "id_cliente" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."clientes_id_cliente_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."comercios" (
    "id_comercio" integer NOT NULL,
    "nombre" character varying(120) NOT NULL,
    "nit" character varying(30),
    "telefono_whatsapp" character varying(20),
    "direccion" character varying(200),
    "fecha_creacion" timestamp with time zone DEFAULT "now"(),
    "activo" boolean DEFAULT true NOT NULL,
    "phone_number_id" character varying,
    "horario_atencion" "jsonb",
    "datos_transferencia" "text",
    "entregas" "text"[] DEFAULT ARRAY['domicilio'::"text", 'recogida'::"text"] NOT NULL,
    "modo_seguimiento" "text" DEFAULT 'basico'::"text" NOT NULL,
    "tiempo_preparacion" "text" DEFAULT '30-45 minutos'::"text",
    "tiempo_respuesta" "text" DEFAULT 'unos minutos'::"text",
    "canal" "text" DEFAULT 'telegram'::"text" NOT NULL,
    "telefono_alertas" character varying(20),
    CONSTRAINT "comercios_canal_chk" CHECK (("canal" = ANY (ARRAY['telegram'::"text", 'whatsapp'::"text"])))
);


ALTER TABLE "public"."comercios" OWNER TO "postgres";


ALTER TABLE "public"."comercios" ALTER COLUMN "id_comercio" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."comercios_id_comercio_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."conversaciones" (
    "id_conversacion" integer NOT NULL,
    "id_comercio" integer NOT NULL,
    "id_cliente" integer NOT NULL,
    "identificador_whatsapp" character varying(150),
    "estado" "public"."estado_conversacion" DEFAULT 'activa'::"public"."estado_conversacion" NOT NULL,
    "fecha_inicio" timestamp with time zone DEFAULT "now"(),
    "fecha_ultima_actividad" timestamp with time zone DEFAULT "now"(),
    "estado_bot" "text" DEFAULT 'MENU'::"text" NOT NULL,
    "subestado" "text",
    "pausada" boolean DEFAULT false NOT NULL,
    "intentos" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."conversaciones" OWNER TO "postgres";


ALTER TABLE "public"."conversaciones" ALTER COLUMN "id_conversacion" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."conversaciones_id_conversacion_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."detalle_pedido" (
    "id_detalle" integer NOT NULL,
    "id_pedido" integer NOT NULL,
    "id_producto" integer NOT NULL,
    "cantidad" integer NOT NULL,
    "precio_unitario" numeric(12,2) NOT NULL,
    "subtotal" numeric(12,2),
    "nombre_producto" character varying(120),
    "especificaciones" character varying(200),
    CONSTRAINT "chk_detalle_cantidad" CHECK (("cantidad" > 0)),
    CONSTRAINT "chk_detalle_precio" CHECK (("precio_unitario" >= (0)::numeric))
);


ALTER TABLE "public"."detalle_pedido" OWNER TO "postgres";


ALTER TABLE "public"."detalle_pedido" ALTER COLUMN "id_detalle" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."detalle_pedido_id_detalle_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."eventos_error" (
    "id" bigint NOT NULL,
    "origen" "text",
    "detalle" "text",
    "creado_en" timestamp with time zone DEFAULT "now"() NOT NULL,
    "comercio_id" integer
);


ALTER TABLE "public"."eventos_error" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."eventos_error_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."eventos_error_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."eventos_error_id_seq" OWNED BY "public"."eventos_error"."id";



CREATE TABLE IF NOT EXISTS "public"."guias" (
    "id" bigint NOT NULL,
    "comercio_id" integer NOT NULL,
    "contenido" "text",
    "vigente" boolean DEFAULT true NOT NULL,
    "nombre" "text",
    "actualizado_en" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."guias" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."guias_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."guias_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."guias_id_seq" OWNED BY "public"."guias"."id";



CREATE TABLE IF NOT EXISTS "public"."historial_estados" (
    "id" bigint NOT NULL,
    "pedido_id" integer NOT NULL,
    "estado_anterior" "text",
    "estado_nuevo" "text" NOT NULL,
    "motivo" "text",
    "aviso_estado" "text" DEFAULT 'pendiente'::"text" NOT NULL,
    "aviso_intentos" integer DEFAULT 0 NOT NULL,
    "creado_en" timestamp with time zone DEFAULT "now"() NOT NULL,
    "usuario_id" "uuid"
);


ALTER TABLE "public"."historial_estados" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."historial_estados_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."historial_estados_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."historial_estados_id_seq" OWNED BY "public"."historial_estados"."id";



CREATE TABLE IF NOT EXISTS "public"."mensajes" (
    "id_mensaje" bigint NOT NULL,
    "id_conversacion" integer NOT NULL,
    "id_pedido" integer,
    "direccion" "public"."direccion_mensaje" NOT NULL,
    "contenido" "text" NOT NULL,
    "tipo_mensaje" "public"."tipo_mensaje" DEFAULT 'texto'::"public"."tipo_mensaje" NOT NULL,
    "identificador_mensaje_whatsapp" character varying(180),
    "fecha_mensaje" timestamp with time zone DEFAULT "now"(),
    "estado_envio" "public"."estado_envio" DEFAULT 'recibido'::"public"."estado_envio" NOT NULL,
    "autor" "text",
    CONSTRAINT "mensajes_autor_chk" CHECK (("autor" = ANY (ARRAY['cliente'::"text", 'bot'::"text", 'dueno'::"text"])))
);


ALTER TABLE "public"."mensajes" OWNER TO "postgres";


ALTER TABLE "public"."mensajes" ALTER COLUMN "id_mensaje" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."mensajes_id_mensaje_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."pedidos" (
    "id_pedido" integer NOT NULL,
    "id_comercio" integer NOT NULL,
    "id_cliente" integer NOT NULL,
    "id_conversacion" integer,
    "fecha_pedido" timestamp with time zone DEFAULT "now"(),
    "direccion_entrega" character varying(250) NOT NULL,
    "metodo_pago" "public"."metodo_pago" NOT NULL,
    "estado" "public"."estado_pedido" DEFAULT 'pendiente'::"public"."estado_pedido" NOT NULL,
    "total" numeric(12,2) DEFAULT 0.00 NOT NULL,
    "observaciones" "text",
    "cliente_wa_id" character varying,
    "idempotency_key" "text",
    "id" integer GENERATED ALWAYS AS ("id_pedido") STORED,
    "comercio_id" integer GENERATED ALWAYS AS ("id_comercio") STORED,
    "creado_en" timestamp with time zone GENERATED ALWAYS AS ("fecha_pedido") STORED,
    "tipo_entrega" "text",
    CONSTRAINT "chk_pedido_total" CHECK (("total" >= (0)::numeric)),
    CONSTRAINT "pedidos_tipo_entrega_chk" CHECK (("tipo_entrega" = ANY (ARRAY['domicilio'::"text", 'recogida'::"text"])))
);


ALTER TABLE "public"."pedidos" OWNER TO "postgres";


ALTER TABLE "public"."pedidos" ALTER COLUMN "id_pedido" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."pedidos_id_pedido_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."productos" (
    "id_producto" integer NOT NULL,
    "id_comercio" integer NOT NULL,
    "nombre" character varying(120) NOT NULL,
    "descripcion" "text",
    "marca" character varying(80),
    "precio" numeric(12,2) NOT NULL,
    "stock" integer DEFAULT 0 NOT NULL,
    "imagen_url" character varying(500),
    "disponible" boolean DEFAULT true NOT NULL,
    "fecha_creacion" timestamp with time zone DEFAULT "now"(),
    "categoria" character varying,
    "eliminado" boolean DEFAULT false NOT NULL,
    "id" integer GENERATED ALWAYS AS ("id_producto") STORED,
    "comercio_id" integer GENERATED ALWAYS AS ("id_comercio") STORED,
    CONSTRAINT "chk_producto_precio" CHECK (("precio" >= (0)::numeric)),
    CONSTRAINT "chk_producto_stock" CHECK (("stock" >= 0))
);


ALTER TABLE "public"."productos" OWNER TO "postgres";


ALTER TABLE "public"."productos" ALTER COLUMN "id_producto" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."productos_id_producto_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."solicitudes" (
    "id" bigint NOT NULL,
    "id_comercio" integer NOT NULL,
    "pedido_id" integer NOT NULL,
    "wa_id" "text" NOT NULL,
    "tipo" "text" NOT NULL,
    "detalle" "text",
    "estado" "text" DEFAULT 'pendiente'::"text" NOT NULL,
    "creado_en" timestamp with time zone DEFAULT "now"() NOT NULL,
    "resuelta_por" "uuid",
    "resuelta_en" timestamp with time zone,
    "aviso_estado" "text" DEFAULT 'pendiente'::"text" NOT NULL,
    CONSTRAINT "solicitudes_estado_chk" CHECK (("estado" = ANY (ARRAY['pendiente'::"text", 'aceptada'::"text", 'rechazada'::"text"]))),
    CONSTRAINT "solicitudes_tipo_check" CHECK (("tipo" = ANY (ARRAY['modificacion'::"text", 'cancelacion'::"text"])))
);


ALTER TABLE "public"."solicitudes" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."solicitudes_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."solicitudes_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."solicitudes_id_seq" OWNED BY "public"."solicitudes"."id";



CREATE TABLE IF NOT EXISTS "public"."usuarios" (
    "id_usuario" integer NOT NULL,
    "id_comercio" integer NOT NULL,
    "nombre" character varying(100) NOT NULL,
    "correo" character varying(150) NOT NULL,
    "password_hash" character varying(255),
    "rol" "public"."rol_usuario" DEFAULT 'administrador'::"public"."rol_usuario" NOT NULL,
    "fecha_creacion" timestamp with time zone DEFAULT "now"(),
    "activo" boolean DEFAULT true NOT NULL,
    "auth_user_id" "uuid"
);


ALTER TABLE "public"."usuarios" OWNER TO "postgres";


ALTER TABLE "public"."usuarios" ALTER COLUMN "id_usuario" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."usuarios_id_usuario_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE OR REPLACE VIEW "public"."v_comercios" WITH ("security_invoker"='true') AS
 SELECT "id_comercio" AS "id",
    "nombre",
    "activo",
    "phone_number_id",
    "horario_atencion",
    "direccion",
    "datos_transferencia",
    "entregas",
    "modo_seguimiento",
    "tiempo_preparacion",
    "tiempo_respuesta"
   FROM "public"."comercios" "c";


ALTER VIEW "public"."v_comercios" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_pedidos_cliente" WITH ("security_invoker"='true') AS
 SELECT "p"."id_comercio" AS "comercio_id",
    "c"."telefono_whatsapp" AS "cliente_wa_id",
    "p"."fecha_pedido" AS "creado_en",
    "p"."id_pedido" AS "numero",
    ("p"."estado")::"text" AS "estado",
    "p"."total"
   FROM ("public"."pedidos" "p"
     JOIN "public"."clientes" "c" ON (("c"."id_cliente" = "p"."id_cliente")));


ALTER VIEW "public"."v_pedidos_cliente" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_productos" WITH ("security_invoker"='true') AS
 SELECT "id_comercio" AS "comercio_id",
    COALESCE("categoria", 'Otros'::character varying) AS "categoria",
    "nombre",
    "precio",
    "disponible",
    "eliminado"
   FROM "public"."productos"
  WHERE (NOT "eliminado");


ALTER VIEW "public"."v_productos" OWNER TO "postgres";


ALTER TABLE ONLY "public"."alertas" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."alertas_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."autorizaciones" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."autorizaciones_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."carritos" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."carritos_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."eventos_error" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."eventos_error_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."guias" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."guias_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."historial_estados" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."historial_estados_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."solicitudes" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."solicitudes_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."admins_plataforma"
    ADD CONSTRAINT "admins_plataforma_pkey" PRIMARY KEY ("auth_user_id");



ALTER TABLE ONLY "public"."alertas"
    ADD CONSTRAINT "alertas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."auditoria_admin"
    ADD CONSTRAINT "auditoria_admin_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."autorizaciones"
    ADD CONSTRAINT "autorizaciones_id_comercio_wa_id_key" UNIQUE ("id_comercio", "wa_id");



ALTER TABLE ONLY "public"."autorizaciones"
    ADD CONSTRAINT "autorizaciones_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."carritos"
    ADD CONSTRAINT "carritos_id_comercio_wa_id_key" UNIQUE ("id_comercio", "wa_id");



ALTER TABLE ONLY "public"."carritos"
    ADD CONSTRAINT "carritos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clientes"
    ADD CONSTRAINT "clientes_pkey" PRIMARY KEY ("id_cliente");



ALTER TABLE ONLY "public"."comercios"
    ADD CONSTRAINT "comercios_pkey" PRIMARY KEY ("id_comercio");



ALTER TABLE ONLY "public"."conversaciones"
    ADD CONSTRAINT "conversaciones_pkey" PRIMARY KEY ("id_conversacion");



ALTER TABLE ONLY "public"."detalle_pedido"
    ADD CONSTRAINT "detalle_pedido_pkey" PRIMARY KEY ("id_detalle");



ALTER TABLE ONLY "public"."eventos_error"
    ADD CONSTRAINT "eventos_error_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."guias"
    ADD CONSTRAINT "guias_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."historial_estados"
    ADD CONSTRAINT "historial_estados_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mensajes"
    ADD CONSTRAINT "mensajes_pkey" PRIMARY KEY ("id_mensaje");



ALTER TABLE ONLY "public"."pedidos"
    ADD CONSTRAINT "pedidos_pkey" PRIMARY KEY ("id_pedido");



ALTER TABLE ONLY "public"."productos"
    ADD CONSTRAINT "productos_pkey" PRIMARY KEY ("id_producto");



ALTER TABLE "public"."productos"
    ADD CONSTRAINT "productos_precio_entero_chk" CHECK (("precio" = "trunc"("precio"))) NOT VALID;



ALTER TABLE "public"."productos"
    ADD CONSTRAINT "productos_precio_pos_chk" CHECK (("precio" > (0)::numeric)) NOT VALID;



ALTER TABLE ONLY "public"."solicitudes"
    ADD CONSTRAINT "solicitudes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clientes"
    ADD CONSTRAINT "uq_cliente_telefono" UNIQUE ("id_comercio", "telefono_whatsapp");



ALTER TABLE ONLY "public"."mensajes"
    ADD CONSTRAINT "uq_mensaje_whatsapp" UNIQUE ("identificador_mensaje_whatsapp");



ALTER TABLE ONLY "public"."usuarios"
    ADD CONSTRAINT "usuarios_auth_user_id_key" UNIQUE ("auth_user_id");



ALTER TABLE ONLY "public"."usuarios"
    ADD CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id_usuario");



CREATE UNIQUE INDEX "comercios_phone_number_id_uq" ON "public"."comercios" USING "btree" ("phone_number_id");



CREATE INDEX "fk_detalle_producto" ON "public"."detalle_pedido" USING "btree" ("id_producto");



CREATE INDEX "fk_mensajes_conversacion" ON "public"."mensajes" USING "btree" ("id_conversacion");



CREATE INDEX "fk_mensajes_pedido" ON "public"."mensajes" USING "btree" ("id_pedido");



CREATE INDEX "fk_pedidos_cliente" ON "public"."pedidos" USING "btree" ("id_cliente");



CREATE INDEX "fk_pedidos_conversacion" ON "public"."pedidos" USING "btree" ("id_conversacion");



CREATE INDEX "fk_usuarios_comercio" ON "public"."usuarios" USING "btree" ("id_comercio");



CREATE UNIQUE INDEX "guias_vigente_uq" ON "public"."guias" USING "btree" ("comercio_id") WHERE "vigente";



CREATE INDEX "idx_alertas_pendientes" ON "public"."alertas" USING "btree" ("id_comercio") WHERE (NOT "atendida");



CREATE INDEX "idx_conversaciones_cliente" ON "public"."conversaciones" USING "btree" ("id_cliente");



CREATE INDEX "idx_conversaciones_comercio" ON "public"."conversaciones" USING "btree" ("id_comercio");



CREATE INDEX "idx_detalle_pedido" ON "public"."detalle_pedido" USING "btree" ("id_pedido");



CREATE INDEX "idx_mensajes_conversacion_fecha" ON "public"."mensajes" USING "btree" ("id_conversacion", "fecha_mensaje");



CREATE INDEX "idx_mensajes_fecha" ON "public"."mensajes" USING "btree" ("fecha_mensaje");



CREATE INDEX "idx_pedidos_comercio_estado" ON "public"."pedidos" USING "btree" ("id_comercio", "estado");



CREATE INDEX "idx_pedidos_comercio_estado_fecha" ON "public"."pedidos" USING "btree" ("id_comercio", "estado", "fecha_pedido" DESC);



CREATE INDEX "idx_pedidos_estado" ON "public"."pedidos" USING "btree" ("estado");



CREATE INDEX "idx_pedidos_fecha" ON "public"."pedidos" USING "btree" ("fecha_pedido");



CREATE INDEX "idx_productos_comercio" ON "public"."productos" USING "btree" ("id_comercio");



CREATE INDEX "idx_productos_comercio_disp" ON "public"."productos" USING "btree" ("id_comercio", "disponible");



CREATE INDEX "idx_productos_nombre" ON "public"."productos" USING "btree" ("nombre");



CREATE UNIQUE INDEX "pedidos_idempotency_uq" ON "public"."pedidos" USING "btree" ("idempotency_key") WHERE ("idempotency_key" IS NOT NULL);



CREATE UNIQUE INDEX "uq_usuarios_correo" ON "public"."usuarios" USING "btree" ("lower"(("correo")::"text"));



CREATE UNIQUE INDEX "usuarios_auth_user_id_uq" ON "public"."usuarios" USING "btree" ("auth_user_id") WHERE ("auth_user_id" IS NOT NULL);



CREATE OR REPLACE TRIGGER "historial_inmutable" BEFORE DELETE OR UPDATE ON "public"."historial_estados" FOR EACH ROW EXECUTE FUNCTION "public"."tg_historial_inmutable"();



CREATE OR REPLACE TRIGGER "pedidos_historial" AFTER UPDATE OF "estado" ON "public"."pedidos" FOR EACH ROW EXECUTE FUNCTION "public"."tg_pedidos_historial"();



CREATE OR REPLACE TRIGGER "pedidos_validar_estado" BEFORE UPDATE OF "estado" ON "public"."pedidos" FOR EACH ROW EXECUTE FUNCTION "public"."tg_pedidos_validar_estado"();



CREATE OR REPLACE TRIGGER "trg_conversaciones_ultima_actividad" BEFORE UPDATE ON "public"."conversaciones" FOR EACH ROW EXECUTE FUNCTION "public"."set_fecha_ultima_actividad"();



ALTER TABLE ONLY "public"."admins_plataforma"
    ADD CONSTRAINT "admins_plataforma_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."alertas"
    ADD CONSTRAINT "alertas_id_comercio_fkey" FOREIGN KEY ("id_comercio") REFERENCES "public"."comercios"("id_comercio");



ALTER TABLE ONLY "public"."alertas"
    ADD CONSTRAINT "alertas_id_conversacion_fkey" FOREIGN KEY ("id_conversacion") REFERENCES "public"."conversaciones"("id_conversacion") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."carritos"
    ADD CONSTRAINT "carritos_id_comercio_fkey" FOREIGN KEY ("id_comercio") REFERENCES "public"."comercios"("id_comercio");



ALTER TABLE ONLY "public"."clientes"
    ADD CONSTRAINT "fk_clientes_comercio" FOREIGN KEY ("id_comercio") REFERENCES "public"."comercios"("id_comercio");



ALTER TABLE ONLY "public"."conversaciones"
    ADD CONSTRAINT "fk_conversaciones_cliente" FOREIGN KEY ("id_cliente") REFERENCES "public"."clientes"("id_cliente");



ALTER TABLE ONLY "public"."conversaciones"
    ADD CONSTRAINT "fk_conversaciones_comercio" FOREIGN KEY ("id_comercio") REFERENCES "public"."comercios"("id_comercio");



ALTER TABLE ONLY "public"."detalle_pedido"
    ADD CONSTRAINT "fk_detalle_pedido" FOREIGN KEY ("id_pedido") REFERENCES "public"."pedidos"("id_pedido");



ALTER TABLE ONLY "public"."detalle_pedido"
    ADD CONSTRAINT "fk_detalle_producto" FOREIGN KEY ("id_producto") REFERENCES "public"."productos"("id_producto");



ALTER TABLE ONLY "public"."mensajes"
    ADD CONSTRAINT "fk_mensajes_conversacion" FOREIGN KEY ("id_conversacion") REFERENCES "public"."conversaciones"("id_conversacion");



ALTER TABLE ONLY "public"."mensajes"
    ADD CONSTRAINT "fk_mensajes_pedido" FOREIGN KEY ("id_pedido") REFERENCES "public"."pedidos"("id_pedido") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pedidos"
    ADD CONSTRAINT "fk_pedidos_cliente" FOREIGN KEY ("id_cliente") REFERENCES "public"."clientes"("id_cliente");



ALTER TABLE ONLY "public"."pedidos"
    ADD CONSTRAINT "fk_pedidos_comercio" FOREIGN KEY ("id_comercio") REFERENCES "public"."comercios"("id_comercio");



ALTER TABLE ONLY "public"."pedidos"
    ADD CONSTRAINT "fk_pedidos_conversacion" FOREIGN KEY ("id_conversacion") REFERENCES "public"."conversaciones"("id_conversacion") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."productos"
    ADD CONSTRAINT "fk_productos_comercio" FOREIGN KEY ("id_comercio") REFERENCES "public"."comercios"("id_comercio");



ALTER TABLE ONLY "public"."usuarios"
    ADD CONSTRAINT "fk_usuarios_comercio" FOREIGN KEY ("id_comercio") REFERENCES "public"."comercios"("id_comercio");



ALTER TABLE ONLY "public"."historial_estados"
    ADD CONSTRAINT "historial_estados_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos"("id_pedido");



ALTER TABLE ONLY "public"."solicitudes"
    ADD CONSTRAINT "solicitudes_id_comercio_fkey" FOREIGN KEY ("id_comercio") REFERENCES "public"."comercios"("id_comercio");



ALTER TABLE ONLY "public"."solicitudes"
    ADD CONSTRAINT "solicitudes_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos"("id_pedido");



ALTER TABLE ONLY "public"."usuarios"
    ADD CONSTRAINT "usuarios_auth_user_fk" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL NOT VALID;



ALTER TABLE "public"."admins_plataforma" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."alertas" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "alertas_select" ON "public"."alertas" FOR SELECT TO "authenticated" USING (("id_comercio" = ( SELECT "public"."mi_comercio"() AS "mi_comercio")));



ALTER TABLE "public"."auditoria_admin" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."autorizaciones" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."carritos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."clientes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "clientes_select" ON "public"."clientes" FOR SELECT TO "authenticated" USING (("id_comercio" = ( SELECT "public"."mi_comercio"() AS "mi_comercio")));



ALTER TABLE "public"."comercios" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "comercios_select" ON "public"."comercios" FOR SELECT TO "authenticated" USING (("id_comercio" = ( SELECT "public"."mi_comercio"() AS "mi_comercio")));



CREATE POLICY "comercios_update" ON "public"."comercios" FOR UPDATE TO "authenticated" USING (("id_comercio" = ( SELECT "public"."mi_comercio"() AS "mi_comercio"))) WITH CHECK (("id_comercio" = ( SELECT "public"."mi_comercio"() AS "mi_comercio")));



ALTER TABLE "public"."conversaciones" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "conversaciones_select" ON "public"."conversaciones" FOR SELECT TO "authenticated" USING (("id_comercio" = ( SELECT "public"."mi_comercio"() AS "mi_comercio")));



ALTER TABLE "public"."detalle_pedido" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "detalle_pedido_select" ON "public"."detalle_pedido" FOR SELECT TO "authenticated" USING (("id_pedido" IN ( SELECT "p"."id_pedido"
   FROM "public"."pedidos" "p"
  WHERE ("p"."id_comercio" = ( SELECT "public"."mi_comercio"() AS "mi_comercio")))));



ALTER TABLE "public"."eventos_error" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."guias" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "guias_insert" ON "public"."guias" FOR INSERT TO "authenticated" WITH CHECK (("comercio_id" = ( SELECT "public"."mi_comercio"() AS "mi_comercio")));



CREATE POLICY "guias_select" ON "public"."guias" FOR SELECT TO "authenticated" USING (("comercio_id" = ( SELECT "public"."mi_comercio"() AS "mi_comercio")));



CREATE POLICY "guias_update" ON "public"."guias" FOR UPDATE TO "authenticated" USING (("comercio_id" = ( SELECT "public"."mi_comercio"() AS "mi_comercio"))) WITH CHECK (("comercio_id" = ( SELECT "public"."mi_comercio"() AS "mi_comercio")));



ALTER TABLE "public"."historial_estados" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "historial_estados_select" ON "public"."historial_estados" FOR SELECT TO "authenticated" USING (("pedido_id" IN ( SELECT "p"."id_pedido"
   FROM "public"."pedidos" "p"
  WHERE ("p"."id_comercio" = ( SELECT "public"."mi_comercio"() AS "mi_comercio")))));



ALTER TABLE "public"."mensajes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "mensajes_select" ON "public"."mensajes" FOR SELECT TO "authenticated" USING (("id_conversacion" IN ( SELECT "c"."id_conversacion"
   FROM "public"."conversaciones" "c"
  WHERE (("c"."id_comercio" = ( SELECT "public"."mi_comercio"() AS "mi_comercio")) AND (EXISTS ( SELECT 1
           FROM "public"."alertas" "a"
          WHERE (("a"."id_comercio" = "c"."id_comercio") AND ("a"."id_conversacion" = "c"."id_conversacion") AND "a"."con_contenido")))))));



ALTER TABLE "public"."pedidos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pedidos_select" ON "public"."pedidos" FOR SELECT TO "authenticated" USING (("id_comercio" = ( SELECT "public"."mi_comercio"() AS "mi_comercio")));



ALTER TABLE "public"."productos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "productos_insert" ON "public"."productos" FOR INSERT TO "authenticated" WITH CHECK (("id_comercio" = ( SELECT "public"."mi_comercio"() AS "mi_comercio")));



CREATE POLICY "productos_select" ON "public"."productos" FOR SELECT TO "authenticated" USING (("id_comercio" = ( SELECT "public"."mi_comercio"() AS "mi_comercio")));



CREATE POLICY "productos_update" ON "public"."productos" FOR UPDATE TO "authenticated" USING (("id_comercio" = ( SELECT "public"."mi_comercio"() AS "mi_comercio"))) WITH CHECK (("id_comercio" = ( SELECT "public"."mi_comercio"() AS "mi_comercio")));



ALTER TABLE "public"."solicitudes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "solicitudes_select" ON "public"."solicitudes" FOR SELECT TO "authenticated" USING ((("id_comercio" = ( SELECT "public"."mi_comercio"() AS "mi_comercio")) AND (EXISTS ( SELECT 1
   FROM "public"."alertas" "a"
  WHERE (("a"."id_comercio" = "solicitudes"."id_comercio") AND ("a"."wa_id" = "solicitudes"."wa_id") AND "a"."con_contenido")))));



ALTER TABLE "public"."usuarios" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "usuarios_select" ON "public"."usuarios" FOR SELECT TO "authenticated" USING (("auth_user_id" = ( SELECT "auth"."uid"() AS "uid")));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































REVOKE ALL ON FUNCTION "public"."_conv"("p_comercio_id" integer, "p_wa_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."_conv"("p_comercio_id" integer, "p_wa_id" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."_conv_id"("p_comercio_id" integer, "p_wa_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."_conv_id"("p_comercio_id" integer, "p_wa_id" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_actualizar_comercio"("p_id" integer, "p_phone_number_id" "text", "p_activo" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_actualizar_comercio"("p_id" integer, "p_phone_number_id" "text", "p_activo" boolean) TO "service_role";
GRANT ALL ON FUNCTION "public"."admin_actualizar_comercio"("p_id" integer, "p_phone_number_id" "text", "p_activo" boolean) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."admin_listar_comercios"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_listar_comercios"() TO "service_role";
GRANT ALL ON FUNCTION "public"."admin_listar_comercios"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."agregar_items"("p_comercio_id" integer, "p_wa_id" "text", "p_items" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."agregar_items"("p_comercio_id" integer, "p_wa_id" "text", "p_items" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."alternativas_categoria"("p_comercio_id" integer, "p_categoria" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."alternativas_categoria"("p_comercio_id" integer, "p_categoria" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."calcular_resumen"("p_comercio_id" integer, "p_wa_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."calcular_resumen"("p_comercio_id" integer, "p_wa_id" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."cerrar_atenciones_inactivas"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cerrar_atenciones_inactivas"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."crear_alerta"("p_comercio_id" integer, "p_wa_id" "text", "p_tipo" "text", "p_con_contenido" boolean, "p_detalle" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."crear_alerta"("p_comercio_id" integer, "p_wa_id" "text", "p_tipo" "text", "p_con_contenido" boolean, "p_detalle" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."crear_pedido"("p_comercio_id" integer, "p_wa_id" "text", "p_idempotency_key" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."crear_pedido"("p_comercio_id" integer, "p_wa_id" "text", "p_idempotency_key" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."crear_solicitud"("p_comercio_id" integer, "p_wa_id" "text", "p_pedido_id" integer, "p_tipo" "text", "p_detalle" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."crear_solicitud"("p_comercio_id" integer, "p_wa_id" "text", "p_pedido_id" integer, "p_tipo" "text", "p_detalle" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."datos_notificacion"("p_historial_id" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."datos_notificacion"("p_historial_id" bigint) TO "service_role";



REVOKE ALL ON FUNCTION "public"."descartar_carrito"("p_comercio_id" integer, "p_wa_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."descartar_carrito"("p_comercio_id" integer, "p_wa_id" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."descartar_carritos_expirados"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."descartar_carritos_expirados"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."es_plataforma"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."es_plataforma"() TO "service_role";
GRANT ALL ON FUNCTION "public"."es_plataforma"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."guardar_dato"("p_comercio_id" integer, "p_wa_id" "text", "p_nombre" "text", "p_direccion" "text", "p_subestado" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."guardar_dato"("p_comercio_id" integer, "p_wa_id" "text", "p_nombre" "text", "p_direccion" "text", "p_subestado" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."guardar_entrega"("p_comercio_id" integer, "p_wa_id" "text", "p_entrega" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."guardar_entrega"("p_comercio_id" integer, "p_wa_id" "text", "p_entrega" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."guardar_pago"("p_comercio_id" integer, "p_wa_id" "text", "p_pago" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."guardar_pago"("p_comercio_id" integer, "p_wa_id" "text", "p_pago" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."incrementar_intentos"("p_comercio_id" integer, "p_wa_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."incrementar_intentos"("p_comercio_id" integer, "p_wa_id" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."iniciar_pedido"("p_comercio_id" integer, "p_wa_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."iniciar_pedido"("p_comercio_id" integer, "p_wa_id" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."listar_avisos_pendientes"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."listar_avisos_pendientes"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."marcar_aviso"("p_historial_id" bigint, "p_estado" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."marcar_aviso"("p_historial_id" bigint, "p_estado" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."mi_comercio"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."mi_comercio"() TO "service_role";
GRANT ALL ON FUNCTION "public"."mi_comercio"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."obtener_autorizacion"("p_comercio_id" integer, "p_wa_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."obtener_autorizacion"("p_comercio_id" integer, "p_wa_id" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."obtener_carrito"("p_comercio_id" integer, "p_wa_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."obtener_carrito"("p_comercio_id" integer, "p_wa_id" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."obtener_conversacion"("p_comercio_id" integer, "p_wa_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."obtener_conversacion"("p_comercio_id" integer, "p_wa_id" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."panel_cambiar_estado"("p_pedido_id" integer, "p_estado" "text", "p_motivo" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."panel_cambiar_estado"("p_pedido_id" integer, "p_estado" "text", "p_motivo" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."panel_cambiar_estado"("p_pedido_id" integer, "p_estado" "text", "p_motivo" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."panel_finalizar_atencion"("p_conversacion_id" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."panel_finalizar_atencion"("p_conversacion_id" integer) TO "service_role";
GRANT ALL ON FUNCTION "public"."panel_finalizar_atencion"("p_conversacion_id" integer) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."panel_marcar_alerta_atendida"("p_alerta_id" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."panel_marcar_alerta_atendida"("p_alerta_id" bigint) TO "service_role";
GRANT ALL ON FUNCTION "public"."panel_marcar_alerta_atendida"("p_alerta_id" bigint) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."panel_resolver_solicitud"("p_solicitud_id" bigint, "p_decision" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."panel_resolver_solicitud"("p_solicitud_id" bigint, "p_decision" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."panel_resolver_solicitud"("p_solicitud_id" bigint, "p_decision" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."pausar_conversacion"("p_comercio_id" integer, "p_wa_id" "text", "p_tipo" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."pausar_conversacion"("p_comercio_id" integer, "p_wa_id" "text", "p_tipo" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."registrar_autorizacion"("p_comercio_id" integer, "p_wa_id" "text", "p_decision" "text", "p_version" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."registrar_autorizacion"("p_comercio_id" integer, "p_wa_id" "text", "p_decision" "text", "p_version" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."registrar_aviso_enviado"("p_comercio_id" integer, "p_wa_id" "text", "p_version" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."registrar_aviso_enviado"("p_comercio_id" integer, "p_wa_id" "text", "p_version" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."registrar_mensaje_entrante"("p_comercio_id" integer, "p_wa_id" "text", "p_tipo" "text", "p_wa_message_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."registrar_mensaje_entrante"("p_comercio_id" integer, "p_wa_id" "text", "p_tipo" "text", "p_wa_message_id" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."registrar_mensaje_entrante_con_contenido"("p_comercio_id" integer, "p_wa_id" "text", "p_tipo" "text", "p_wa_message_id" "text", "p_contenido" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."registrar_mensaje_entrante_con_contenido"("p_comercio_id" integer, "p_wa_id" "text", "p_tipo" "text", "p_wa_message_id" "text", "p_contenido" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."registrar_mensaje_pausa"("p_conversacion_id" integer, "p_contenido" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."registrar_mensaje_pausa"("p_conversacion_id" integer, "p_contenido" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."registrar_mensaje_saliente"("p_comercio_id" integer, "p_wa_id" "text", "p_autor" "text", "p_contenido" "text", "p_wa_message_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."registrar_mensaje_saliente"("p_comercio_id" integer, "p_wa_id" "text", "p_autor" "text", "p_contenido" "text", "p_wa_message_id" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."reiniciar_estado"("p_comercio_id" integer, "p_wa_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reiniciar_estado"("p_comercio_id" integer, "p_wa_id" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_estado"("p_comercio_id" integer, "p_wa_id" "text", "p_estado" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_estado"("p_comercio_id" integer, "p_wa_id" "text", "p_estado" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_fecha_ultima_actividad"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_fecha_ultima_actividad"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_subestado"("p_comercio_id" integer, "p_wa_id" "text", "p_subestado" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_subestado"("p_comercio_id" integer, "p_wa_id" "text", "p_subestado" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."tg_historial_inmutable"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."tg_historial_inmutable"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."tg_pedidos_historial"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."tg_pedidos_historial"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."tg_pedidos_validar_estado"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."tg_pedidos_validar_estado"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."ultimo_cliente_sin_respuesta"("p_comercio_id" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."ultimo_cliente_sin_respuesta"("p_comercio_id" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."verificar_propiedad_conversacion"("p_user_id" "uuid", "p_conversacion_id" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."verificar_propiedad_conversacion"("p_user_id" "uuid", "p_conversacion_id" integer) TO "service_role";


















GRANT ALL ON TABLE "public"."admins_plataforma" TO "service_role";



GRANT ALL ON TABLE "public"."alertas" TO "service_role";
GRANT SELECT ON TABLE "public"."alertas" TO "authenticated";



GRANT ALL ON SEQUENCE "public"."alertas_id_seq" TO "service_role";
GRANT USAGE ON SEQUENCE "public"."alertas_id_seq" TO "authenticated";



GRANT ALL ON TABLE "public"."auditoria_admin" TO "service_role";



GRANT USAGE ON SEQUENCE "public"."auditoria_admin_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."auditoria_admin_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."autorizaciones" TO "service_role";



GRANT ALL ON SEQUENCE "public"."autorizaciones_id_seq" TO "service_role";
GRANT USAGE ON SEQUENCE "public"."autorizaciones_id_seq" TO "authenticated";



GRANT ALL ON TABLE "public"."carritos" TO "service_role";



GRANT ALL ON SEQUENCE "public"."carritos_id_seq" TO "service_role";
GRANT USAGE ON SEQUENCE "public"."carritos_id_seq" TO "authenticated";



GRANT ALL ON TABLE "public"."clientes" TO "service_role";
GRANT SELECT ON TABLE "public"."clientes" TO "authenticated";



GRANT ALL ON SEQUENCE "public"."clientes_id_cliente_seq" TO "service_role";
GRANT USAGE ON SEQUENCE "public"."clientes_id_cliente_seq" TO "authenticated";



GRANT ALL ON TABLE "public"."comercios" TO "service_role";
GRANT SELECT ON TABLE "public"."comercios" TO "authenticated";



GRANT UPDATE("nombre") ON TABLE "public"."comercios" TO "authenticated";



GRANT UPDATE("direccion") ON TABLE "public"."comercios" TO "authenticated";



GRANT UPDATE("horario_atencion") ON TABLE "public"."comercios" TO "authenticated";



GRANT UPDATE("datos_transferencia") ON TABLE "public"."comercios" TO "authenticated";



GRANT UPDATE("entregas") ON TABLE "public"."comercios" TO "authenticated";



GRANT UPDATE("modo_seguimiento") ON TABLE "public"."comercios" TO "authenticated";



GRANT UPDATE("tiempo_preparacion") ON TABLE "public"."comercios" TO "authenticated";



GRANT UPDATE("tiempo_respuesta") ON TABLE "public"."comercios" TO "authenticated";



GRANT UPDATE("telefono_alertas") ON TABLE "public"."comercios" TO "authenticated";



GRANT ALL ON SEQUENCE "public"."comercios_id_comercio_seq" TO "service_role";
GRANT USAGE ON SEQUENCE "public"."comercios_id_comercio_seq" TO "authenticated";



GRANT ALL ON TABLE "public"."conversaciones" TO "service_role";
GRANT SELECT ON TABLE "public"."conversaciones" TO "authenticated";



GRANT ALL ON SEQUENCE "public"."conversaciones_id_conversacion_seq" TO "service_role";
GRANT USAGE ON SEQUENCE "public"."conversaciones_id_conversacion_seq" TO "authenticated";



GRANT ALL ON TABLE "public"."detalle_pedido" TO "service_role";
GRANT SELECT ON TABLE "public"."detalle_pedido" TO "authenticated";



GRANT ALL ON SEQUENCE "public"."detalle_pedido_id_detalle_seq" TO "service_role";
GRANT USAGE ON SEQUENCE "public"."detalle_pedido_id_detalle_seq" TO "authenticated";



GRANT ALL ON TABLE "public"."eventos_error" TO "service_role";



GRANT ALL ON SEQUENCE "public"."eventos_error_id_seq" TO "service_role";
GRANT USAGE ON SEQUENCE "public"."eventos_error_id_seq" TO "authenticated";



GRANT ALL ON TABLE "public"."guias" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."guias" TO "authenticated";



GRANT ALL ON SEQUENCE "public"."guias_id_seq" TO "service_role";
GRANT USAGE ON SEQUENCE "public"."guias_id_seq" TO "authenticated";



GRANT ALL ON TABLE "public"."historial_estados" TO "service_role";
GRANT SELECT ON TABLE "public"."historial_estados" TO "authenticated";



GRANT ALL ON SEQUENCE "public"."historial_estados_id_seq" TO "service_role";
GRANT USAGE ON SEQUENCE "public"."historial_estados_id_seq" TO "authenticated";



GRANT ALL ON TABLE "public"."mensajes" TO "service_role";
GRANT SELECT ON TABLE "public"."mensajes" TO "authenticated";



GRANT ALL ON SEQUENCE "public"."mensajes_id_mensaje_seq" TO "service_role";
GRANT USAGE ON SEQUENCE "public"."mensajes_id_mensaje_seq" TO "authenticated";



GRANT ALL ON TABLE "public"."pedidos" TO "service_role";
GRANT SELECT ON TABLE "public"."pedidos" TO "authenticated";



GRANT ALL ON SEQUENCE "public"."pedidos_id_pedido_seq" TO "service_role";
GRANT USAGE ON SEQUENCE "public"."pedidos_id_pedido_seq" TO "authenticated";



GRANT ALL ON TABLE "public"."productos" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."productos" TO "authenticated";



GRANT ALL ON SEQUENCE "public"."productos_id_producto_seq" TO "service_role";
GRANT USAGE ON SEQUENCE "public"."productos_id_producto_seq" TO "authenticated";



GRANT ALL ON TABLE "public"."solicitudes" TO "service_role";
GRANT SELECT ON TABLE "public"."solicitudes" TO "authenticated";



GRANT ALL ON SEQUENCE "public"."solicitudes_id_seq" TO "service_role";
GRANT USAGE ON SEQUENCE "public"."solicitudes_id_seq" TO "authenticated";



GRANT ALL ON TABLE "public"."usuarios" TO "service_role";



GRANT SELECT("id_usuario") ON TABLE "public"."usuarios" TO "authenticated";



GRANT SELECT("id_comercio") ON TABLE "public"."usuarios" TO "authenticated";



GRANT SELECT("nombre") ON TABLE "public"."usuarios" TO "authenticated";



GRANT SELECT("correo") ON TABLE "public"."usuarios" TO "authenticated";



GRANT SELECT("rol") ON TABLE "public"."usuarios" TO "authenticated";



GRANT SELECT("activo") ON TABLE "public"."usuarios" TO "authenticated";



GRANT SELECT("auth_user_id") ON TABLE "public"."usuarios" TO "authenticated";



GRANT ALL ON SEQUENCE "public"."usuarios_id_usuario_seq" TO "service_role";
GRANT USAGE ON SEQUENCE "public"."usuarios_id_usuario_seq" TO "authenticated";



GRANT ALL ON TABLE "public"."v_comercios" TO "service_role";



GRANT ALL ON TABLE "public"."v_pedidos_cliente" TO "service_role";



GRANT ALL ON TABLE "public"."v_productos" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































