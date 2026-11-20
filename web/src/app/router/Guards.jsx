import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../providers.jsx';
import { PageLoader } from '../../shared/ui/Feedback.jsx';

export function RequireSession({ role }) {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <PageLoader label="Preparando tu espacio…" />;
  if (!user) return <Navigate to="/ingresar" replace state={{ from: location.pathname }} />;
  if (role && user.role !== role)
    return <Navigate to={user.role === 'admin' ? '/admin' : '/inicio'} replace />;
  return <Outlet />;
}

export function GuestOnly() {
  const { user, ready } = useAuth();
  if (!ready) return <PageLoader label="Cargando…" />;
  return user ? <Navigate to={user.role === 'admin' ? '/admin' : '/inicio'} replace /> : <Outlet />;
}
