import { getSupabase, translateDatabaseError } from './supabase.js';

function merchantFromRow(row) {
  return {
    id: row.id_comercio,
    nombre_comercial: row.nombre,
    activo: row.activo,
    canal: row.canal || 'telegram',
    identificador_canal: row.phone_number_id || '',
    productos: row.productos,
    guia: row.tiene_guia,
    horario: row.tiene_horario,
  };
}

export async function listMerchants() {
  const { data, error } = await getSupabase().rpc('admin_listar_comercios');
  if (error) throw translateDatabaseError(error);
  return (data || []).map(merchantFromRow);
}

export async function updateMerchant({ id, phoneNumberId = null, active = null }) {
  const { data, error } = await getSupabase().rpc('admin_actualizar_comercio', {
    p_id: id,
    p_phone_number_id: phoneNumberId,
    p_activo: active,
  });
  if (error) throw translateDatabaseError(error);
  return data;
}

export async function toggleMerchant(id, active) {
  return updateMerchant({ id, active });
}

export async function savePhoneId(id, value) {
  return updateMerchant({ id, phoneNumberId: value.trim() || null });
}
