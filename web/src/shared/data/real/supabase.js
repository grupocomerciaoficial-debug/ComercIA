import { createClient } from '@supabase/supabase-js';

let client;

export function getSupabase() {
  if (client) return client;
  const { VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY } = import.meta.env;
  if (!VITE_SUPABASE_URL || !VITE_SUPABASE_ANON_KEY) {
    throw new Error(
      'Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY para conectar el panel con Supabase local.',
    );
  }
  client = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return client;
}

export function translateDatabaseError(error) {
  const message = String(error?.message || error || '');
  const messages = {
    transicion_invalida: 'Ese cambio de estado no está permitido.',
    sin_permiso: 'Tu cuenta no tiene permiso para realizar esta acción.',
    pedido_no_encontrado: 'No encontramos ese pedido en tu comercio.',
    solicitud_no_encontrada: 'No encontramos esa solicitud en tu comercio.',
    solicitud_ya_resuelta: 'Esta solicitud ya fue atendida.',
    alerta_no_encontrada: 'No encontramos esa alerta pendiente.',
    conversacion_no_encontrada: 'No encontramos esa conversación en tu comercio.',
    decision_invalida: 'La decisión solicitada no es válida.',
  };
  const code = Object.keys(messages).find((value) => message.includes(value));
  if (code) return new Error(messages[code]);
  if (error?.code === '42501') return new Error(messages.sin_permiso);
  return new Error('No pudimos completar la operación. Inténtalo de nuevo.');
}
