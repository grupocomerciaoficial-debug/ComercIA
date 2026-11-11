import { getSupabase, translateDatabaseError } from './supabase.js';

const alertColumns = 'id,id_comercio,wa_id,tipo,con_contenido,atendida,id_conversacion,creado_en';
const alertType = {
  hablar_con_persona: 'persona',
  no_autorizo_tratamiento: 'sin_autorizacion',
  solicitud_modificacion: 'solicitud',
  solicitud_cancelacion: 'solicitud',
};

export async function listAlerts({ commerceId } = {}) {
  const supabase = getSupabase();
  const [alertsResult, commerceResult] = await Promise.all([
    supabase
      .from('alertas')
      .select(alertColumns)
      .eq('id_comercio', commerceId)
      .eq('atendida', false)
      .order('creado_en', { ascending: false }),
    supabase.from('comercios').select('canal').eq('id_comercio', commerceId).maybeSingle(),
  ]);
  if (alertsResult.error) throw translateDatabaseError(alertsResult.error);
  if (commerceResult.error) throw translateDatabaseError(commerceResult.error);

  const rows = alertsResult.data || [];
  const channel = commerceResult.data?.canal || 'telegram';
  const authorizedReferences = new Set(
    rows.filter((alert) => alert.con_contenido).map((alert) => alert.wa_id),
  );
  const safeRows = rows.filter(
    (alert) => alert.con_contenido && authorizedReferences.has(alert.wa_id),
  );
  const safeReferences = safeRows.map((alert) => alert.wa_id);
  let alertDetails = new Map();
  if (safeRows.length) {
    const { data: details, error: detailError } = await supabase
      .from('alertas')
      .select('id,detalle')
      .eq('id_comercio', commerceId)
      .eq('con_contenido', true)
      .in(
        'id',
        safeRows.map((alert) => alert.id),
      );
    if (detailError) throw translateDatabaseError(detailError);
    alertDetails = new Map((details || []).map((row) => [row.id, row.detalle]));
  }

  let requests = [];
  let messagesByConversation = new Map();
  const authorizedRows = rows.filter((alert) => safeReferences.includes(alert.wa_id));
  if (authorizedRows.length) {
    const { data: pendingRequests, error: requestError } = await supabase
      .from('solicitudes')
      .select('id,id_comercio,pedido_id,wa_id,tipo,detalle,estado,creado_en')
      .eq('id_comercio', commerceId)
      .eq('estado', 'pendiente')
      .in('wa_id', [...new Set(safeReferences)]);
    if (requestError) throw translateDatabaseError(requestError);
    requests = pendingRequests || [];

    const conversationIds = [
      ...new Set(authorizedRows.map((alert) => alert.id_conversacion).filter(Boolean)),
    ];
    if (conversationIds.length) {
      const { data: messages, error: messageError } = await supabase
        .from('mensajes')
        .select('id_conversacion,direccion,autor,contenido,fecha_mensaje')
        .in('id_conversacion', conversationIds)
        .order('fecha_mensaje', { ascending: true })
        .limit(500);
      if (messageError) throw translateDatabaseError(messageError);
      messagesByConversation = new Map();
      for (const message of messages || []) {
        const items = messagesByConversation.get(message.id_conversacion) || [];
        items.push({
          autor:
            message.autor === 'dueno'
              ? 'dueño'
              : message.autor || (message.direccion === 'entrante' ? 'cliente' : 'bot'),
          contenido: message.contenido,
          fecha: message.fecha_mensaje,
        });
        messagesByConversation.set(message.id_conversacion, items);
      }
    }
  }

  return rows.map((alert) => {
    const authorized = alert.con_contenido && authorizedReferences.has(alert.wa_id);
    const type = alertType[alert.tipo] || 'persona';
    const requestType = alert.tipo === 'solicitud_cancelacion' ? 'cancelacion' : 'modificacion';
    const request =
      authorized && type === 'solicitud'
        ? requests.find(
            (item) =>
              item.wa_id === alert.wa_id &&
              item.tipo === requestType &&
              item.detalle === alertDetails.get(alert.id)?.replace(/^Pedido #\d+:\s*/, ''),
          ) || requests.find((item) => item.wa_id === alert.wa_id && item.tipo === requestType)
        : null;

    return {
      id: String(alert.id),
      solicitud_id: request?.id || null,
      conversacion_id: alert.id_conversacion,
      conversation_id: alert.id_conversacion,
      tipo: authorized
        ? type
        : alert.tipo === 'no_autorizo_tratamiento'
          ? 'sin_autorizacion'
          : type,
      canal: channel,
      cliente_ref: alert.wa_id || '',
      telefono: alert.wa_id || '',
      autorizado: authorized,
      anonimizado: false,
      creado_en: alert.creado_en,
      order_id: request?.pedido_id || null,
      solicitud: request ? { ...request, detalle: request.detalle } : null,
      detalle: authorized ? request?.detalle || alertDetails.get(alert.id) || null : null,
      mensajes: authorized ? messagesByConversation.get(alert.id_conversacion) || [] : [],
      con_contenido: authorized,
    };
  });
}

export async function countAlerts({ commerceId } = {}) {
  const { count, error } = await getSupabase()
    .from('alertas')
    .select('id', { count: 'exact', head: true })
    .eq('id_comercio', commerceId)
    .eq('atendida', false);
  if (error) throw translateDatabaseError(error);
  return count || 0;
}

export async function resolveAlert(id, { conversationId, type } = {}) {
  const supabase = getSupabase();
  const operation =
    type === 'persona'
      ? supabase.rpc('panel_finalizar_atencion', { p_conversacion_id: conversationId })
      : supabase.rpc('panel_marcar_alerta_atendida', { p_alerta_id: Number(id) });
  const { data, error } = await operation;
  if (error) throw translateDatabaseError(error);
  return data;
}

export async function decideRequest(id, decision) {
  if (!['aceptada', 'rechazada'].includes(decision))
    throw new Error('La decisión solicitada no es válida.');
  const { data, error } = await getSupabase().rpc('panel_resolver_solicitud', {
    p_solicitud_id: Number(id),
    p_decision: decision,
  });
  if (error) throw translateDatabaseError(error);
  return data;
}

export async function sendOwnerMessage(conversationId, content, session) {
  const endpoint = import.meta.env.VITE_N8N_PANEL_ENVIAR_URL?.trim();
  if (!endpoint)
    throw new Error(
      'El envío desde el panel aún no está configurado. Contacta al equipo ComercIA.',
    );
  if (!session?.token)
    throw new Error('Tu sesión terminó. Vuelve a iniciar sesión para responder.');

  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify({
        id_conversacion: conversationId,
        conversacion_id: conversationId,
        contenido: content,
        texto: content,
      }),
    });
  } catch {
    throw new Error('No pudimos conectar con el servicio de mensajería. Inténtalo de nuevo.');
  }
  if (!response.ok)
    throw new Error('No pudimos enviar el mensaje. Revisa la conexión e inténtalo de nuevo.');
  return response.json().catch(() => ({ ok: true }));
}
