import { getSupabase, translateDatabaseError } from './supabase.js';

async function hydrateSession(session) {
  if (!session) return null;
  const supabase = getSupabase();
  const authUserId = session.user.id;
  const { data: isPlatformAdmin, error: adminError } = await supabase.rpc('es_plataforma');
  if (adminError) throw translateDatabaseError(adminError);

  if (isPlatformAdmin) {
    return {
      user: {
        id: authUserId,
        email: session.user.email,
        name: session.user.user_metadata?.nombre || session.user.email,
        role: 'admin',
        comercio_id: null,
      },
      token: session.access_token,
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from('usuarios')
    .select('id_usuario,id_comercio,nombre,correo,rol,activo,auth_user_id')
    .eq('auth_user_id', authUserId)
    .maybeSingle();
  if (profileError) throw translateDatabaseError(profileError);
  if (!profile || !profile.activo || !profile.id_comercio) {
    await supabase.auth.signOut();
    throw new Error(
      'Tu cuenta no está activa o no está asociada a un comercio. Contacta al equipo ComercIA.',
    );
  }

  const { data: business, error: businessError } = await supabase
    .from('comercios')
    .select('nombre,canal')
    .eq('id_comercio', profile.id_comercio)
    .maybeSingle();
  if (businessError) throw translateDatabaseError(businessError);
  if (!business) {
    await supabase.auth.signOut();
    throw new Error(
      'No encontramos el comercio asociado a tu cuenta. Contacta al equipo ComercIA.',
    );
  }

  return {
    user: {
      id: authUserId,
      email: profile.correo || session.user.email,
      name: profile.nombre,
      role: 'dueno',
      comercio_id: profile.id_comercio,
      comercio_nombre: business.nombre,
      canal: business.canal || 'telegram',
    },
    token: session.access_token,
  };
}

export async function getSession() {
  const { data, error } = await getSupabase().auth.getSession();
  if (error) throw translateDatabaseError(error);
  return hydrateSession(data.session);
}

export async function signIn({ email, password }) {
  const { data, error } = await getSupabase().auth.signInWithPassword({ email, password });
  if (error) throw new Error('No pudimos iniciar sesión. Revisa tu correo y contraseña.');
  try {
    return await hydrateSession(data.session);
  } catch (profileError) {
    await getSupabase().auth.signOut();
    throw profileError;
  }
}

export async function signOut() {
  const { error } = await getSupabase().auth.signOut();
  if (error) throw translateDatabaseError(error);
}

export async function sendRecovery(email, redirectTo) {
  const { error } = await getSupabase().auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw new Error('No pudimos enviar el enlace. Revisa el correo e inténtalo de nuevo.');
}

export async function updatePassword(password) {
  const { error } = await getSupabase().auth.updateUser({ password });
  if (error) throw new Error('No pudimos guardar la nueva contraseña. Vuelve a intentarlo.');
}
