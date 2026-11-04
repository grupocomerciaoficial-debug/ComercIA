import { getSupabase, translateDatabaseError } from './supabase.js';

const productColumns =
  'id_producto,id_comercio,nombre,descripcion,precio,categoria,disponible,eliminado';

function fromRow(row) {
  return {
    id: row.id_producto,
    comercio_id: row.id_comercio,
    nombre: row.nombre,
    descripcion: row.descripcion || '',
    precio: Number(row.precio),
    categoria: row.categoria || 'Otros',
    disponibilidad: row.disponible ? 'disponible' : 'agotado',
  };
}

export async function listProducts({ commerceId, query = '', availability = 'Todos' } = {}) {
  let request = getSupabase()
    .from('productos')
    .select(productColumns)
    .eq('id_comercio', commerceId)
    .eq('eliminado', false)
    .order('nombre');

  if (availability !== 'Todos') request = request.eq('disponible', availability === 'disponible');
  if (query.trim()) request = request.ilike('nombre', `%${query.trim()}%`);

  const { data, error } = await request;
  if (error) throw translateDatabaseError(error);
  return (data || []).map(fromRow);
}

export async function saveProduct(value, { commerceId, id } = {}) {
  const payload = {
    nombre: value.nombre.trim(),
    descripcion: value.descripcion?.trim() || null,
    precio: Number(value.precio),
    categoria: value.categoria.trim(),
    disponible: value.disponibilidad === 'disponible',
    id_comercio: commerceId,
  };
  const request = id
    ? getSupabase()
        .from('productos')
        .update(payload)
        .eq('id_producto', id)
        .eq('id_comercio', commerceId)
    : getSupabase().from('productos').insert(payload);
  const { data, error } = await request.select(productColumns).single();
  if (error) throw translateDatabaseError(error);
  return fromRow(data);
}

export async function setProductAvailability(id, availability, { commerceId } = {}) {
  const { data, error } = await getSupabase()
    .from('productos')
    .update({ disponible: availability === 'disponible' })
    .eq('id_producto', id)
    .eq('id_comercio', commerceId)
    .eq('eliminado', false)
    .select('id_producto,disponible')
    .single();
  if (error) throw translateDatabaseError(error);
  return { id: data.id_producto, disponibilidad: data.disponible ? 'disponible' : 'agotado' };
}

export async function softDeleteProduct(id, { commerceId } = {}) {
  const { data, error } = await getSupabase()
    .from('productos')
    .update({ eliminado: true, disponible: false })
    .eq('id_producto', id)
    .eq('id_comercio', commerceId)
    .eq('eliminado', false)
    .select('id_producto')
    .single();
  if (error) throw translateDatabaseError(error);
  return { id: data.id_producto };
}
