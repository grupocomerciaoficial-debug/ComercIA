import {
  Bell,
  BookOpenText,
  ChevronDown,
  Command,
  FileText,
  KeyRound,
  LogOut,
  Mail,
  Menu,
  Package,
  ReceiptText,
  Search,
  Settings,
  ShieldCheck,
  Store,
  UserCog,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth, useToast } from '../providers.jsx';
import { useEffect, useRef, useState } from 'react';
import { Button, FormField, Modal } from '../../shared/ui/Components.jsx';

const titles = {
  '/inicio': 'Tu tienda, en un vistazo',
  '/pedidos': 'Pedidos',
  '/catalogo': 'Catálogo',
  '/atencion': 'Bandeja de atención',
  '/comercio': 'Mi comercio',
  '/guia': 'Guía del negocio',
  '/admin': 'Administración',
};

export function Header({ admin, user, count = 0, onOpenMobile }) {
  const location = useLocation(),
    navigate = useNavigate(),
    { signOut } = useAuth(),
    toast = useToast(),
    [profileOpen, setProfileOpen] = useState(false),
    [searchOpen, setSearchOpen] = useState(false),
    [editProfileOpen, setEditProfileOpen] = useState(false);

  const title = titles[location.pathname] || 'ComercIA';
  const now = new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'America/Bogota',
  }).format(new Date());

  // Atajo para abrir búsqueda: Cmd+K o Ctrl+K
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  async function logout() {
    try {
      await signOut();
      navigate('/ingresar');
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  return (
    <>
      <header className="topbar">
        <button className="topbar-menu" onClick={onOpenMobile} aria-label="Abrir menú">
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
          <button
            className="top-search"
            onClick={() => setSearchOpen(true)}
            title="Buscar o navegar (Ctrl + K)"
          >
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
                    setProfileOpen(false);
                    setEditProfileOpen(true);
                  }}
                >
                  <UserCog size={15} />
                  Configurar perfil
                </button>
                <button
                  onClick={() => {
                    navigate('/restablecer');
                    setProfileOpen(false);
                  }}
                >
                  <KeyRound size={15} />
                  Actualizar contraseña
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

      {/* Modal de Configurar Perfil */}
      {editProfileOpen && (
        <ProfileModal
          open={editProfileOpen}
          onClose={() => setEditProfileOpen(false)}
          user={user}
          admin={admin}
        />
      )}

      {/* Modal de búsqueda rápida */}
      {searchOpen && (
        <SearchPaletteModal open={searchOpen} onClose={() => setSearchOpen(false)} admin={admin} />
      )}
    </>
  );
}

function ProfileModal({ open, onClose, user, admin }) {
  const { updateProfile } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);

  async function handleSave(e) {
    e.preventDefault();
    if (!name.trim()) {
      toast('El nombre no puede estar vacío.', 'error');
      return;
    }
    setSaving(true);
    try {
      await updateProfile({ name: name.trim() });
      toast('Perfil actualizado correctamente.');
      onClose();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="small"
      title="Configurar perfil"
      description="Consulta y actualiza los datos de tu cuenta personal."
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" loading={saving} onClick={handleSave}>
            Guardar cambios
          </Button>
        </>
      }
    >
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            paddingBottom: '0.75rem',
            borderBottom: '1px solid var(--border-subtle, #e2e8f0)',
          }}
        >
          <span className="user-avatar" style={{ width: 44, height: 44, fontSize: '1rem' }}>
            {(name || user?.name || 'C')
              .split(' ')
              .map((s) => s[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()}
          </span>
          <div>
            <b style={{ display: 'block', fontSize: '1rem' }}>{name || user?.name}</b>
            <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
              {admin ? 'Administrador de plataforma' : user?.comercio_nombre || 'Dueño de comercio'}
            </span>
          </div>
        </div>

        <FormField label="Nombre completo" id="profileName">
          <input
            id="profileName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tu nombre completo"
            required
          />
        </FormField>

        <FormField
          label="Correo electrónico"
          id="profileEmail"
          hint="El correo de autenticación no puede modificarse directamente."
        >
          <input
            id="profileEmail"
            value={user?.email || ''}
            readOnly
            disabled
            style={{ opacity: 0.75, cursor: 'not-allowed', background: '#f8fafc' }}
          />
        </FormField>

        {user?.comercio_nombre && (
          <FormField label="Comercio asignado" id="profileCommerce">
            <input
              id="profileCommerce"
              value={user.comercio_nombre}
              readOnly
              disabled
              style={{ opacity: 0.75, cursor: 'not-allowed', background: '#f8fafc' }}
            />
          </FormField>
        )}

        <div
          style={{
            paddingTop: '0.75rem',
            borderTop: '1px solid var(--border-subtle, #e2e8f0)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <b style={{ fontSize: '0.875rem', display: 'block' }}>Seguridad de acceso</b>
            <small style={{ color: '#64748b' }}>¿Deseas cambiar tu contraseña?</small>
          </div>
          <Button
            type="button"
            variant="soft"
            icon={KeyRound}
            onClick={() => {
              onClose();
              navigate('/restablecer');
            }}
          >
            Actualizar contraseña
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function SearchPaletteModal({ open, onClose, admin }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const adminItems = [
    {
      label: 'Administración de Comercios',
      path: '/admin',
      icon: Store,
      hint: 'Ver y configurar comercios',
    },
    {
      label: 'Actualizar Contraseña',
      path: '/restablecer',
      icon: KeyRound,
      hint: 'Cambiar clave de acceso',
    },
    {
      label: 'Política de Tratamiento de Datos',
      path: '/privacidad',
      icon: ShieldCheck,
      hint: 'Revisar datos y aviso legal',
    },
    {
      label: 'Términos y Condiciones',
      path: '/terminos',
      icon: FileText,
      hint: 'Consultar condiciones del servicio',
    },
  ];

  const ownerItems = [
    {
      label: 'Inicio · Tu tienda en un vistazo',
      path: '/inicio',
      icon: Store,
      hint: 'Dashboard y métricas',
    },
    {
      label: 'Pedidos · Gestión y estados',
      path: '/pedidos',
      icon: ReceiptText,
      hint: 'Revisar pedidos',
    },
    {
      label: 'Catálogo · Productos y disponibilidad',
      path: '/catalogo',
      icon: Package,
      hint: 'Ver productos',
    },
    {
      label: 'Atención · Bandeja de mensajes',
      path: '/atencion',
      icon: Bell,
      hint: 'Mensajes y solicitudes',
    },
    {
      label: 'Mi Comercio · Horarios y entregas',
      path: '/comercio',
      icon: Settings,
      hint: 'Ajustes del negocio',
    },
    {
      label: 'Guía del Negocio · Documentación y PDF',
      path: '/guia',
      icon: BookOpenText,
      hint: 'Subir o editar guía',
    },
    {
      label: 'Actualizar Contraseña',
      path: '/restablecer',
      icon: KeyRound,
      hint: 'Cambiar clave de acceso',
    },
    {
      label: 'Política de Tratamiento de Datos',
      path: '/privacidad',
      icon: ShieldCheck,
      hint: 'Información legal',
    },
    {
      label: 'Términos y Condiciones',
      path: '/terminos',
      icon: FileText,
      hint: 'Consultar condiciones del servicio',
    },
  ];

  const allItems = admin ? adminItems : ownerItems;
  const filtered = allItems.filter(
    (item) =>
      item.label.toLowerCase().includes(query.toLowerCase()) ||
      item.hint.toLowerCase().includes(query.toLowerCase()),
  );

  function selectItem(path) {
    onClose();
    navigate(path);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="medium"
      title="Búsqueda y navegación rápida"
      description="Escribe para encontrar rápidamente cualquier sección del sistema."
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por sección o función…"
            style={{
              width: '100%',
              padding: '0.75rem 1rem 0.75rem 2.5rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.95rem',
            }}
          />
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            maxHeight: '320px',
            overflowY: 'auto',
          }}
        >
          {filtered.length ? (
            filtered.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.path + item.label}
                  type="button"
                  onClick={() => selectItem(item.path)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.875rem',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid transparent',
                    background: '#f8fafc',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f1f5f9';
                    e.currentTarget.style.borderColor = '#cbd5e1';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#f8fafc';
                    e.currentTarget.style.borderColor = 'transparent';
                  }}
                >
                  <span
                    style={{
                      padding: '6px',
                      borderRadius: '6px',
                      background: '#e0f2fe',
                      color: '#0284c7',
                      display: 'flex',
                    }}
                  >
                    <Icon size={18} />
                  </span>
                  <div style={{ flex: 1 }}>
                    <b style={{ display: 'block', fontSize: '0.9rem', color: '#1e293b' }}>
                      {item.label}
                    </b>
                    <small style={{ color: '#64748b', fontSize: '0.8rem' }}>{item.hint}</small>
                  </div>
                  <kbd
                    style={{
                      fontSize: '0.75rem',
                      color: '#94a3b8',
                      padding: '2px 6px',
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '4px',
                    }}
                  >
                    ↵ Ir
                  </kbd>
                </button>
              );
            })
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
              No encontramos resultados para &quot;<b>{query}</b>&quot;.
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
