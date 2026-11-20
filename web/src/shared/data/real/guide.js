import { getSupabase, translateDatabaseError } from './supabase.js';

const guideColumns = 'id,comercio_id,nombre,contenido,vigente,actualizado_en';

export async function getGuide({ commerceId } = {}) {
  const { data, error } = await getSupabase()
    .from('guias')
    .select(guideColumns)
    .eq('comercio_id', commerceId)
    .eq('vigente', true)
    .maybeSingle();
  if (error) throw translateDatabaseError(error);
  return data || { id: null, contenido: '', nombre: '' };
}

export async function saveGuide(value, { commerceId } = {}) {
  const supabase = getSupabase();
  const { data: current, error: readError } = await supabase
    .from('guias')
    .select('id')
    .eq('comercio_id', commerceId)
    .eq('vigente', true)
    .maybeSingle();
  if (readError) throw translateDatabaseError(readError);

  const payload = {
    comercio_id: commerceId,
    nombre: value.nombre.trim(),
    contenido: value.contenido.trim(),
    vigente: true,
    actualizado_en: new Date().toISOString(),
  };
  const request = current
    ? supabase.from('guias').update(payload).eq('id', current.id)
    : supabase.from('guias').insert(payload);
  const { data, error } = await request.select(guideColumns).single();
  if (error) throw translateDatabaseError(error);
  return data;
}
