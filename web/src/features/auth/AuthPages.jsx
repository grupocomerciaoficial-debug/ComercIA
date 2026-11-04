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
          Al continuar, aceptas nuestra{' '}
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
  const { user, updatePassword } = useAuth();
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    const password = event.currentTarget.password.value;
    if (password.length < 8) {
      toast('La contraseña debe tener al menos 8 caracteres.', 'error');
      return;
    }
    if (password !== event.currentTarget.confirm.value) {
      toast('Las contraseñas no coinciden.', 'error');
      return;
    }
    setLoading(true);
    try {
      await updatePassword(password);
      toast('Contraseña actualizada.');
      navigate(user?.role === 'admin' ? '/admin' : '/inicio', { replace: true });
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
        <div className="eyebrow">ACTUALIZAR CONTRASEÑA</div>
        <h2>Elige una nueva clave.</h2>
        <form onSubmit={submit}>
          <FormField label="Nueva contraseña">
            <input
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </FormField>
          <FormField label="Confirma tu contraseña">
            <input name="confirm" type="password" required autoComplete="new-password" />
          </FormField>
          <Button type="submit" variant="primary" className="auth-submit" loading={loading}>
            Guardar contraseña
          </Button>
        </form>
      </div>
    </AuthFrame>
  );
}
