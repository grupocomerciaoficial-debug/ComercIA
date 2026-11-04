import { AlertTriangle, ArrowLeft, Boxes, Check, LoaderCircle, SearchX } from 'lucide-react';
import { Link } from 'react-router-dom';
import emptyPedidos from '../../assets/assets-comercia/empty-states/empty-pedidos.svg';
import emptyInbox from '../../assets/assets-comercia/empty-states/empty-inbox.svg';
import emptyBusqueda from '../../assets/assets-comercia/empty-states/empty-busqueda.svg';
import emptyCatalogo from '../../assets/assets-comercia/empty-states/empty-catalogo.svg';

export { emptyPedidos, emptyInbox, emptyBusqueda, emptyCatalogo };

export function PageLoader({ label = 'Cargando…' }) {
  return (
    <main className="loading-screen">
      <div className="loader-orbit">
        <span />
        <i />
        <b />
      </div>
      <p>{label}</p>
    </main>
  );
}
export function Skeleton({ rows = 4 }) {
  return (
    <div className="skeleton-stack" aria-label="Cargando contenido">
      {Array.from({ length: rows }, (_, i) => (
        <div className="skeleton-line" key={i} style={{ width: `${80 - (i % 3) * 13}%` }} />
      ))}
    </div>
  );
}
export function EmptyState({
  icon: Icon = Boxes,
  illustration,
  title,
  description,
  action,
  className = '',
}) {
  return (
    <div className={`empty-state ${className}`}>
      {illustration ? (
        <div className="empty-illustration-wrap">
          <img src={illustration} alt="" className="empty-illustration-img" />
        </div>
      ) : (
        <span className="empty-art">
          <Icon size={24} />
        </span>
      )}
      <h3>{title}</h3>
      <p>{description}</p>
      {action && <div className="empty-action-wrap">{action}</div>}
    </div>
  );
}
export function ErrorState({ error, onRetry }) {
  return (
    <div className="inline-error">
      <span>
        <AlertTriangle size={17} />
      </span>
      <div>
        <b>No pudimos cargar esta parte</b>
        <p>{error?.message || 'Revisa tu conexión e inténtalo de nuevo.'}</p>
      </div>
      {onRetry && (
        <button className="button button-soft button-small" onClick={onRetry}>
          Reintentar
        </button>
      )}
    </div>
  );
}
export function NotFoundPage() {
  return (
    <main className="not-found">
      <span className="not-found-number">404</span>
      <h1>Esta página no está aquí</h1>
      <p>Puede que el enlace haya cambiado. Volvamos a un lugar conocido.</p>
      <Link className="button button-primary" to="/inicio">
        <ArrowLeft size={16} />
        Volver al panel
      </Link>
    </main>
  );
}
export function SuccessMark() {
  return (
    <span className="success-mark">
      <Check size={15} />
    </span>
  );
}
