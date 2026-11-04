import { Bell, ChevronDown, Command, LogOut, Menu, Search, Settings, Sparkles } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth, useToast } from '../providers.jsx';
import { useState } from 'react';
const titles = {
  '/inicio': 'Tu tienda, en un vistazo',
  '/pedidos': 'Pedidos',
  '/catalogo': 'Catálogo',
  '/atencion': 'Bandeja de atención',
  '/comercio': 'Mi comercio',
  '/guia': 'Guía del negocio',
  '/admin': 'Administración',
};
export function Header({ admin, user, count = 0 }) {
  const location = useLocation(),
    navigate = useNavigate(),
    { signOut } = useAuth(),
    toast = useToast(),
    [profileOpen, setProfileOpen] = useState(false);
  const title = titles[location.pathname] || 'ComercIA';
  const now = new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'America/Bogota',
  }).format(new Date());
  async function logout() {
    try {
      await signOut();
      navigate('/ingresar');
    } catch (e) {
      toast(e.message, 'error');
    }
  }
  return (
    <header className="topbar">
      <button
        className="topbar-menu"
        onClick={() => document.body.classList.toggle('menu-open')}
        aria-label="Abrir menú"
      >
        <Menu size={19} />
      </button>
      <div className="topbar-title">
        <span className="topbar-kicker">{admin ? 'PANEL DE ADMINISTRACIÓN' : now}</span>
        <h1>{title}</h1>
      </div>
      <div className="topbar-actions">
        <div className="status-live">
          <span />
          <span>Panel activo</span>
        </div>
        <button className="top-search" onClick={() => navigate('/pedidos')} title="Buscar pedidos">
          <Search size={17} />
          <span>Buscar</span>
          <kbd>
            <Command size={10} /> K
          </kbd>
        </button>
        {!admin && (
          <button
            className="notification-button"
            onClick={() => navigate('/atencion')}
            aria-label={`${count} alertas pendientes`}
          >
            <Bell size={18} />
            {count > 0 && <i>{count > 9 ? '9+' : count}</i>}
          </button>
        )}
        <div className="profile-wrap">
          <button className="profile-trigger" onClick={() => setProfileOpen((v) => !v)}>
            <span className="user-avatar small">
              {(user?.name || 'M')
                .split(' ')
                .map((s) => s[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()}
            </span>
            <ChevronDown size={14} />
          </button>
          {profileOpen && (
            <div className="profile-menu">
              <div className="profile-summary">
                <b>{user?.name}</b>
                <small>{user?.email}</small>
              </div>
              <button
                onClick={() => {
                  navigate(admin ? '/admin' : '/comercio');
                  setProfileOpen(false);
                }}
              >
                <Settings size={15} />
                Configuración
              </button>
              <button onClick={logout}>
                <LogOut size={15} />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
