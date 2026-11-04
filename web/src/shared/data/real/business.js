import { getSupabase, translateDatabaseError } from './supabase.js';

const businessColumns =
  'id_comercio,nombre,direccion,horario_atencion,datos_transferencia,entregas,modo_seguimiento,tiempo_preparacion,tiempo_respuesta,telefono_alertas,canal';
const weekDays = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

function scheduleToForm(schedule) {
  return Object.fromEntries(
    weekDays.map((day) => {
      const hours = schedule?.[day];
      return [
        day,
        {
          activo: Boolean(hours),
          abre: hours?.abre || '09:00',
          cierra: hours?.cierra || '18:00',
        },
      ];
    }),
  );
}

function formToSchedule(schedule = {}) {
  return Object.fromEntries(
    weekDays.map((day) => [
      day,
      schedule[day]?.activo ? { abre: schedule[day].abre, cierra: schedule[day].cierra } : null,
    ]),
  );
}

function fromRow(row) {
  const payment = row.datos_transferencia;
  return {
    id_comercio: row.id_comercio,
    nombre_comercial: row.nombre,
    direccion: row.direccion || '',
    horario: scheduleToForm(row.horario_atencion),
    datos_transferencia: payment || '',
    entregas: {
      domicilio: (row.entregas || []).includes('domicilio'),
      recogida: (row.entregas || []).includes('recogida'),
    },
    pagos: { efectivo: true, transferencia: Boolean(payment) },
    modo_seguimiento: row.modo_seguimiento || 'basico',
    tiempo_estimado: row.tiempo_preparacion || '',
    tiempo_respuesta_humana: row.tiempo_respuesta || '',
    telefono_alertas: row.telefono_alertas || '',
    canal: row.canal || 'telegram',
  };
}

export async function getBusiness({ commerceId } = {}) {
  const { data, error } = await getSupabase()
    .from('comercios')
    .select(businessColumns)
    .eq('id_comercio', commerceId)
    .single();
  if (error) throw translateDatabaseError(error);
  return fromRow(data);
}

export async function saveBusiness(value, { commerceId } = {}) {
  const transferDetails = value.datos_transferencia.trim() || null;
  const payload = {
    nombre: value.nombre_comercial.trim(),
    direccion: value.direccion.trim() || null,
    horario_atencion: formToSchedule(value.horario),
    datos_transferencia: transferDetails,
    entregas: Object.entries(value.entregas || {})
      .filter(([, enabled]) => enabled)
      .map(([name]) => name),
    modo_seguimiento: value.modo_seguimiento,
    tiempo_preparacion: String(value.tiempo_estimado || '').trim() || null,
    tiempo_respuesta: String(value.tiempo_respuesta_humana || '').trim() || null,
    telefono_alertas: value.telefono_alertas.trim() || null,
  };
  const { data, error } = await getSupabase()
    .from('comercios')
    .update(payload)
    .eq('id_comercio', commerceId)
    .select(businessColumns)
    .single();
  if (error) throw translateDatabaseError(error);
  return fromRow(data);
}
