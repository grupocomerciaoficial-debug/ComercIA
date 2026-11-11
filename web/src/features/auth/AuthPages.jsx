import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  Store,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '../../shared/lib/schemas.js';
import { useAuth, useToast } from '../../app/providers.jsx';
import { sendRecovery } from '../../shared/data/real/auth.js';
import { Button, FormField } from '../../shared/ui/Components.jsx';
import { ComerciaLogo } from '../../shared/ui/ComerciaLogo.jsx';

function AuthFrame({ children }) {
  return (
    <main className="auth-page">
      <section className="auth-aside">
        <div className="auth-brand">
          <ComerciaLogo className="auth-logo-lockup" variant="light" />
        </div>
        <div className="auth-art-copy">
          <div className="auth-overline">
            <span />
            <span>COMERCIO LOCAL, CONVERSACIONES CLARAS</span>
          </div>
          <h1>Que ningún pedido se quede esperando.</h1>
          <p>
            El orden para tu tienda puede sentirse natural. Tus pedidos, tu catálogo y tus
            conversaciones, en un solo lugar.
          </p>
          <div className="auth-orbit">
            <div className="orbit-ring orbit-one" />
            <div className="orbit-ring orbit-two" />
            <span className="orbit-center">
              <Store size={24} />
            </span>
            <span className="orbit-chip chip-one">
              Pedido recibido <i />
            </span>
            <span className="orbit-chip chip-two">
              <Sparkles size={13} />
              Todo en orden
            </span>
          </div>
        </div>
        <div className="auth-aside-foot">
          <span>Diseñado para el comercio de todos los días</span>
          <span>·</span>
          <span>Cúcuta, Colombia</span>
        </div>
      </section>
      <section className="auth-main">
        <div className="auth-mobile-brand">
          <ComerciaLogo className="auth-mobile-logo" />
        </div>
        {children}
        <p className="auth-legal">
          Consulta nuestros <Link to="/terminos">Términos y Condiciones</Link> y la{' '}
          <Link to="/privacidad">Política de tratamiento de datos</Link>.
        </p>
      </section>
    </main>
  );
}

export function LoginPage() {
  const { signIn } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const configured = Boolean(
    import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY,
  );
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const submit = handleSubmit(async (credentials) => {
    try {
      const session = await signIn(credentials);
      navigate(location.state?.from || (session.user.role === 'admin' ? '/admin' : '/inicio'), {
        replace: true,
      });
    } catch (error) {
      toast(error.message, 'error');
    }
  });

  return (
    <AuthFrame>
      <div className="auth-card">
        <div className="eyebrow">TU COMERCIO, EN ORDEN</div>
        <h2>Hola de nuevo.</h2>
        <p className="auth-subtitle">Entra a tu espacio para continuar donde lo dejaste.</p>
        {!configured && (
          <div className="notice-box">
            <ShieldCheck size={17} />
            <span>
              Falta configurar la conexión con Supabase local. Revisa las variables del archivo
              `.env.local`.
            </span>
          </div>
        )}
        <form onSubmit={submit} noValidate>
          <FormField label="Correo electrónico" id="email" error={errors.email?.message}>
            <span className="input-with-icon">
              <Mail size={16} />
              <input
                id="email"
                type="email"
                autoComplete="username"
                placeholder="tu@negocio.com"
                {...register('email')}
              />
            </span>
          </FormField>
          <FormField label="Contraseña" id="password" error={errors.password?.message}>
            <span className="input-with-icon">
              <LockKeyhole size={16} />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Tu contraseña"
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </span>
          </FormField>
          <div className="auth-form-meta">
            <span>Tu información está protegida</span>
            <Link to="/recuperar">¿Olvidaste tu contraseña?</Link>
          </div>
          <Button
            type="submit"
            variant="primary"
            className="auth-submit"
            loading={isSubmitting}
            disabled={!configured}
          >
            Entrar a mi comercio <ArrowRight size={16} />
          </Button>
        </form>
      </div>
    </AuthFrame>
  );
}

export function RecoveryPage() {
  const toast = useToast();
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    try {
      await sendRecovery(event.currentTarget.email.value, `${window.location.origin}/restablecer`);
      setDone(true);
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthFrame>
      <div className="auth-card">
        <Link to="/ingresar" className="back-link">
          <ArrowLeft size={15} />
          Volver al inicio de sesión
        </Link>
        <div className="eyebrow">RECUPERAR EL ACCESO</div>
        <h2>{done ? 'Revisa tu correo.' : '¿Olvidaste tu contraseña?'}</h2>
        <p className="auth-subtitle">
          {done
            ? 'Si la dirección existe, te enviaremos los pasos para recuperar el acceso.'
            : 'Te enviaremos un enlace para que puedas crear una contraseña nueva.'}
        </p>
        {!done && (
          <form onSubmit={submit}>
            <FormField id="recoveryEmail" label="Correo electrónico">
              <input
                name="email"
                id="recoveryEmail"
                type="email"
                placeholder="tu@negocio.com"
                required
              />
            </FormField>
            <Button type="submit" variant="primary" className="auth-submit" loading={loading}>
              Enviar enlace <ArrowRight size={16} />
            </Button>
          </form>
        )}
        <p className="auth-create">
          ¿Ya lo recordaste? <Link to="/ingresar">Iniciar sesión</Link>
        </p>
      </div>
    </AuthFrame>
  );
}

export function ResetPasswordPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const { user, updatePassword, ready } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const hash = typeof window !== 'undefined' ? window.location.hash || '' : '';
  const search = typeof window !== 'undefined' ? window.location.search || '' : '';
  const hasAuthError =
    hash.includes('error=') ||
    search.includes('error=') ||
    hash.includes('error_code=') ||
    search.includes('error_code=');

  if (!ready) {
    return (
      <AuthFrame>
        <div className="auth-card">
          <div className="eyebrow">VERIFICANDO</div>
          <h2>Validando tu acceso…</h2>
          <p className="auth-subtitle">Espera un momento mientras verificamos tu enlace.</p>
        </div>
      </AuthFrame>
    );
  }

  if (hasAuthError || !user) {
    return (
      <AuthFrame>
        <div className="auth-card">
          <Link to="/ingresar" className="back-link">
            <ArrowLeft size={15} />
            Volver al inicio de sesión
          </Link>
          <div className="eyebrow">RECUPERACIÓN DE CONTRASEÑA</div>
          <h2>{hasAuthError ? 'Enlace expirado o no válido' : 'Sesión requerida'}</h2>
          <p className="auth-subtitle">
            {hasAuthError
              ? 'El enlace de recuperación ha expirado o ya fue utilizado. Por favor solicita uno nuevo.'
              : 'Para actualizar tu contraseña necesitas abrir el enlace recibido por correo o tener una sesión activa.'}
          </p>
          <div
            style={{
              marginTop: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            <Link
              to="/recuperar"
              className="button button-primary"
              style={{ justifyContent: 'center' }}
            >
              Solicitar nuevo enlace <ArrowRight size={16} />
            </Link>
            <Link
              to="/ingresar"
              className="button button-soft"
              style={{ justifyContent: 'center' }}
            >
              Iniciar sesión
            </Link>
          </div>
        </div>
      </AuthFrame>
    );
  }

  async function submit(event) {
    event.preventDefault();
    const password = event.currentTarget.password.value;
    const confirm = event.currentTarget.confirm.value;
    if (password.length < 8) {
      toast('La contraseña debe tener al menos 8 caracteres.', 'error');
      return;
    }
    if (password !== confirm) {
      toast('Las contraseñas no coinciden.', 'error');
      return;
    }
    setLoading(true);
    try {
      await updatePassword(password);
      toast('Contraseña actualizada correctamente.');
      navigate(user?.role === 'admin' ? '/admin' : '/inicio', { replace: true });
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  const backDestination = user ? (user.role === 'admin' ? '/admin' : '/inicio') : '/ingresar';
  const backLabel = user ? 'Volver al panel' : 'Volver al inicio de sesión';

  return (
    <AuthFrame>
      <div className="auth-card">
        <Link to={backDestination} className="back-link">
          <ArrowLeft size={15} />
          {backLabel}
        </Link>
        <div className="eyebrow">ACTUALIZAR CONTRASEÑA</div>
        <h2>Elige una nueva clave.</h2>
        <p className="auth-subtitle">
          Actualizando la contraseña para <strong>{user.email}</strong>.
        </p>
        <form onSubmit={submit}>
          <FormField label="Nueva contraseña" id="newPassword" hint="Mínimo 8 caracteres">
            <span className="input-with-icon">
              <LockKeyhole size={16} />
              <input
                id="newPassword"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Mínimo 8 caracteres"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </span>
          </FormField>
          <FormField label="Confirma tu contraseña" id="confirmPassword">
            <span className="input-with-icon">
              <LockKeyhole size={16} />
              <input
                id="confirmPassword"
                name="confirm"
                type={showConfirm ? 'text' : 'password'}
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Repite tu nueva contraseña"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((value) => !value)}
                aria-label={showConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </span>
          </FormField>
          <Button type="submit" variant="primary" className="auth-submit" loading={loading}>
            Guardar contraseña <ArrowRight size={16} />
          </Button>
        </form>
      </div>
    </AuthFrame>
  );
}
