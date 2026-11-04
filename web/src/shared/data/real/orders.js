import { getSupabase, translateDatabaseError } from './supabase.js';

const orderColumns =
  'id_pedido,id_comercio,id_cliente,id_conversacion,fecha_pedido,direccion_entrega,tipo_entrega,metodo_pago,estado,total,cliente_wa_id';
const statusToDatabase = {
  Pendiente: 'pendiente',
  Procesado: 'en_proceso',
  Confirmado: 'confirmado',
  Cancelado: 'cancelado',
};
const statusToPanel = Object.fromEntries(
  Object.entries(statusToDatabase).map(([label, value]) => [value, label]),
);

function cleanSearch(value) {
  return String(value || '')
    .trim()
    .replace(/[%,()]/g, ' ');
}

async function customerMap(supabase, commerceId, orders, authorizedReferences) {
  const allowedIds = [
    ...new Set(
      orders
        .filter((order) => authorizedReferences.has(order.cliente_wa_id))
        .map((order) => order.id_cliente),
    ),
  ];
  if (!allowedIds.length) return new Map();

  const { data, error } = await supabase
    .from('clientes')
    .select('id_cliente,nombre,telefono_whatsapp')
    .eq('id_comercio', commerceId)
    .in('id_cliente', allowedIds);
  if (error) throw translateDatabaseError(error);
  return new Map((data || []).map((row) => [row.id_cliente, row]));
}

function toPanelOrder(row, customer, authorized, channel) {
  return {
    id: row.id_pedido,
    comercio_id: row.id_comercio,
    id_cliente: row.id_cliente,
    conversation_id: row.id_conversacion,
    estado: statusToPanel[row.estado] || row.estado,
    total: Number(row.total || 0),
    entrega: row.tipo_entrega,
    direccion: authorized ? row.direccion_entrega : '',
    pago: row.metodo_pago,
    creado_en: row.fecha_pedido,
    cliente: authorized ? customer?.nombre || '' : '',
    cliente_ref: row.cliente_wa_id || '',
    telefono: authorized
      ? customer?.telefono_whatsapp || row.cliente_wa_id
      : row.cliente_wa_id || '',
    autorizado: authorized,
    canal: channel,
  };
}

async function getCommerceChannel(supabase, commerceId) {
  const { data, error } = await supabase
    .from('comercios')
    .select('canal')
    .eq('id_comercio', commerceId)
    .maybeSingle();
  if (error) throw translateDatabaseError(error);
  return data?.canal || 'telegram';
}

export async function listOrders({
  commerceId,
  status = 'Todos',
  query = '',
  page = 1,
  pageSize = 10,
} = {}) {
  const supabase = getSupabase();
  const safeQuery = cleanSearch(query);
  let request = supabase
    .from('pedidos')
    .select(orderColumns, { count: 'exact' })
    .eq('id_comercio', commerceId)
    .order('fecha_pedido', { ascending: false });

  if (status !== 'Todos') {
    const databaseStatus = statusToDatabase[status] || status;
    request = request.eq('estado', databaseStatus);
  }

  if (safeQuery) {
    const customerQuery = await supabase
      .from('clientes')
      .select('id_cliente')
      .eq('id_comercio', commerceId)
      .ilike('nombre', `%${safeQuery}%`)
      .limit(200);
    if (customerQuery.error) throw translateDatabaseError(customerQuery.error);
    const matchingCustomerIds = (customerQuery.data || []).map((row) => row.id_cliente);
    const numericId = /^\d+$/.test(safeQuery) ? Number(safeQuery) : null;
    const clauses = [];
    if (numericId !== null) clauses.push(`id_pedido.eq.${numericId}`);
    if (matchingCustomerIds.length)
      clauses.push(`id_cliente.in.(${matchingCustomerIds.join(',')})`);
    if (!clauses.length) request = request.eq('id_pedido', -1);
    else request = request.or(clauses.join(','));
  }

  const first = (page - 1) * pageSize;
  const { data, error, count } = await request.range(first, first + pageSize - 1);
  if (error) throw translateDatabaseError(error);

  const orders = data || [];
  const authorizedReferences = new Set(orders.map((row) => row.cliente_wa_id).filter(Boolean));
  const [customers, channel] = await Promise.all([
    customerMap(supabase, commerceId, orders, authorizedReferences),
    getCommerceChannel(supabase, commerceId),
  ]);
  return {
    items: orders.map((row) =>
      toPanelOrder(
        row,
        customers.get(row.id_cliente),
        authorizedReferences.has(row.cliente_wa_id),
        channel,
      ),
    ),
    count: count || 0,
    page,
    pageSize,
  };
}

export async function getOrder(id, { commerceId } = {}) {
  const supabase = getSupabase();
  const { data: row, error } = await supabase
    .from('pedidos')
    .select(orderColumns)
    .eq('id_pedido', id)
    .eq('id_comercio', commerceId)
    .maybeSingle();
  if (error) throw translateDatabaseError(error);
  if (!row) throw new Error('No encontramos ese pedido en tu comercio.');

  const authorizedReferences = new Set(row.cliente_wa_id ? [row.cliente_wa_id] : []);
  const authorized = authorizedReferences.has(row.cliente_wa_id);
  const customers = authorized
    ? await customerMap(supabase, commerceId, [row], authorizedReferences)
    : new Map();
  const channel = await getCommerceChannel(supabase, commerceId);
  const result = toPanelOrder(row, customers.get(row.id_cliente), authorized, channel);

  const [historyResult, detailResult] = await Promise.all([
    supabase
      .from('historial_estados')
      .select('estado_anterior,estado_nuevo,motivo,usuario_id,aviso_estado,creado_en')
      .eq('pedido_id', id)
      .order('creado_en', { ascending: true }),
    authorized
      ? supabase
          .from('detalle_pedido')
          .select('nombre_producto,especificaciones,cantidad,precio_unitario,subtotal')
          .eq('id_pedido', id)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (historyResult.error) throw translateDatabaseError(historyResult.error);
  if (detailResult.error) throw translateDatabaseError(detailResult.error);

  result.items = (detailResult.data || []).map((item) => ({
    nombre: item.nombre_producto,
    nombre_producto: item.nombre_producto,
    especificacion: item.especificaciones,
    cantidad: item.cantidad,
    precio_unitario: Number(item.precio_unitario),
    subtotal: Number(item.subtotal),
  }));
  result.historial = (historyResult.data || []).map((entry) => ({
    estado_anterior: statusToPanel[entry.estado_anterior] || entry.estado_anterior,
    estado_nuevo: statusToPanel[entry.estado_nuevo] || entry.estado_nuevo,
    motivo: entry.motivo,
    usuario: entry.usuario_id,
    aviso: entry.aviso_estado,
    fecha: entry.creado_en,
  }));
  result.aviso = result.historial.at(-1)?.aviso === 'no_enviado' ? 'no enviado' : null;
  result.historial = result.historial.map((entry) => ({
    ...entry,
    estado_nuevo: entry.estado_nuevo,
  }));

  if (authorized && row.id_conversacion) {
    const { data: messages, error: messageError } = await supabase
      .from('mensajes')
      .select('direccion,autor,contenido,fecha_mensaje')
      .eq('id_conversacion', row.id_conversacion)
      .order('fecha_mensaje', { ascending: true })
      .limit(100);
    if (messageError) throw translateDatabaseError(messageError);
    result.conversacion = {
      id_conversacion: row.id_conversacion,
      messages: (messages || []).map((message) => ({
        autor: message.autor === 'dueno' ? 'dueño' : message.autor,
        contenido: message.contenido,
        fecha: message.fecha_mensaje,
      })),
    };
  }

  return result;
}

function bogotaDayStart(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return new Date(Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day), 5));
}

export async function orderMetrics({ commerceId } = {}) {
  const supabase = getSupabase();
  const now = new Date();
  const todayStart = bogotaDayStart(now);
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const weekStart = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000);

  const [pendingResult, todayResult, weekResult] = await Promise.all([
    supabase
      .from('pedidos')
      .select('id_pedido', { count: 'exact', head: true })
      .eq('id_comercio', commerceId)
      .eq('estado', 'pendiente'),
    supabase
      .from('pedidos')
      .select('id_pedido,estado,total,fecha_pedido')
      .eq('id_comercio', commerceId)
      .gte('fecha_pedido', todayStart.toISOString())
      .lt('fecha_pedido', todayEnd.toISOString())
      .limit(1000),
    supabase
      .from('pedidos')
      .select('estado,total,fecha_pedido')
      .eq('id_comercio', commerceId)
      .gte('fecha_pedido', weekStart.toISOString())
      .lt('fecha_pedido', todayEnd.toISOString())
      .limit(1000),
  ]);
  for (const result of [pendingResult, todayResult, weekResult]) {
    if (result.error) throw translateDatabaseError(result.error);
  }

  const todayOrders = todayResult.data || [];
  const confirmedToday = todayOrders
    .filter((order) => order.estado === 'confirmado')
    .reduce((total, order) => total + Number(order.total || 0), 0);
  const days = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(weekStart.getTime() + index * 24 * 60 * 60 * 1000);
    return { date: day.toISOString(), value: 0 };
  });
  for (const order of weekResult.data || []) {
    if (order.estado !== 'confirmado') continue;
    const index = Math.floor(
      (bogotaDayStart(new Date(order.fecha_pedido)).getTime() - weekStart.getTime()) / 86_400_000,
    );
    if (index >= 0 && index < days.length) days[index].value += Number(order.total || 0);
  }

  return {
    pending: pendingResult.count || 0,
    confirmedToday,
    completedToday: todayOrders.length,
    total: todayOrders.length,
    byDay: days,
  };
}

export async function transitionOrder(id, nextStatus, reason = '') {
  if (nextStatus === 'Cancelado' && !reason.trim())
    throw new Error('Indica el motivo de la cancelación.');
  const databaseStatus = statusToDatabase[nextStatus];
  if (!databaseStatus) throw new Error('El estado seleccionado no es válido.');
  const { data, error } = await getSupabase().rpc('panel_cambiar_estado', {
    p_pedido_id: id,
    p_estado: databaseStatus,
    p_motivo: reason.trim() || null,
  });
  if (error) throw translateDatabaseError(error);
  return data;
}
