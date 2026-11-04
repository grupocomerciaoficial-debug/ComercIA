import { NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  Bell,
  BookOpenText,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  House,
  Package,
  ReceiptText,
  ShieldCheck,
  Store,
  X,
} from 'lucide-react';
import { ComerciaLogo } from '../../shared/ui/ComerciaLogo.jsx';

const ownerLinks = [
  ['/inicio', 'Inicio', House],
  ['/pedidos', 'Pedidos', ReceiptText],
  ['/catalogo', 'Catálogo', Package],
  ['/atencion', 'Atención', Bell],
  ['/comercio', 'Mi comercio', Store],
  ['/guia', 'Guía del negocio', BookOpenText],
];
const adminLinks = [['/admin', 'Comercios', Store]];

export function Sidebar({ admin, user, count = 0 }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const links = admin ? adminLinks : ownerLinks;

  function go(path) {
    const action = () => navigate(path);
    if (document.startViewTransition) document.startViewTransition(action);
    else action();
    setMobileOpen(false);
  }

  return (
    <>
      <div
        className={`sidebar-backdrop ${mobileOpen ? 'visible' : ''}`}
        onClick={() => setMobileOpen(false)}
      />
      <aside
        className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}
      >
        <div className="sidebar-brand">
          <div
            className="brand-lockup"
            onClick={() => go(admin ? '/admin' : '/inicio')}
            role="button"
            tabIndex="0"
          >
            <ComerciaLogo className="sidebar-logo sidebar-logo-full" variant="dark" />
            <ComerciaLogo className="sidebar-logo sidebar-logo-icon" variant="icon" />
          </div>
          <button
            className="icon-button sidebar-close"
            onClick={() => setMobileOpen(false)}
            aria-label="Cerrar menú"
          >
            <X size={18} />
          </button>
        </div>
        <div className="merchant-switch">
          <span className="merchant-avatar">
            {admin ? <ShieldCheck size={17} /> : <Store size={17} />}
          </span>
          <span className="merchant-copy">
            <b>{admin ? 'Equipo ComercIA' : user?.comercio_nombre}</b>
            <small>{admin ? 'Administración' : 'Comercio conectado'}</small>
          </span>
          <ChevronRight size={15} />
        </div>
        <p className="side-label">ESPACIO DE TRABAJO</p>
        <nav className="side-nav" aria-label="Navegación principal">
          {links.map(([to, label, Icon]) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/inicio' || to === '/admin'}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} />
              <span>{label}</span>
              {label === 'Atención' && count > 0 && (
                <em className="nav-count">{count > 99 ? '99+' : count}</em>
              )}
            </NavLink>
          ))}
        </nav>
        {!admin && <div className="side-spacer" />}
        <div className="side-bottom">
          {!admin && (
            <div className="help-card">
              <div className="help-mark">
                <CircleHelp size={16} />
              </div>
              <b>¿Necesitas ayuda?</b>
              <p>Encuentra la guía rápida para gestionar tu tienda.</p>
              <button onClick={() => go('/guia')}>
                Ver guía <ChevronRight size={14} />
              </button>
            </div>
          )}
          <button className="side-link side-privacy" onClick={() => go('/privacidad')}>
            <ShieldCheck size={17} />
            <span>Privacidad</span>
          </button>
          <div className="user-card">
            <span className="user-avatar">
              {(user?.name || 'C')
                .split(' ')
                .map((part) => part[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()}
            </span>
            <span className="user-copy">
              <b>{user?.name}</b>
              <small>{admin ? 'Administrador' : 'Equipo del comercio'}</small>
            </span>
            <button
              className="icon-button collapse-btn"
              title={collapsed ? 'Expandir menú' : 'Contraer menú'}
              onClick={() => setCollapsed((value) => !value)}
            >
              {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          </div>
        </div>
      </aside>
      <button
        className="mobile-sidebar-toggle"
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir menú"
      >
        <ComerciaLogo variant="icon" className="mobile-toggle-logo" />
        <span>
          Comerc<span>IA</span>
        </span>
      </button>
    </>
  );
}
