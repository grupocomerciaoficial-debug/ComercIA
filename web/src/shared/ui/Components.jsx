import { createPortal } from 'react-dom';
import { useEffect } from 'react';
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  LoaderCircle,
  X,
} from 'lucide-react';
import { createElement } from 'react';
import { ORDER_HELP } from '../lib/contracts.js';
export function Button({
  children,
  variant = 'soft',
  size = '',
  icon: Icon,
  loading = false,
  disabled = false,
  className = '',
  ...props
}) {
  return (
    <button
      className={`button button-${variant} ${size ? `button-${size}` : ''} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <LoaderCircle size={16} className="spin" /> : Icon && <Icon size={16} />}
      {children}
    </button>
  );
}
export function IconButton({ icon: Icon, label, className = '', ...props }) {
  return (
    <button className={`icon-button ${className}`} aria-label={label} title={label} {...props}>
      <Icon size={17} />
    </button>
  );
}
export function PageTitle({ eyebrow, title, description, actions }) {
  return (
    <header className="page-title">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {actions && <div className="page-title-actions">{actions}</div>}
    </header>
  );
}
export function Modal({ open, title, description, children, footer, onClose, size = 'medium' }) {
  useEffect(() => {
    if (!open) return;
    const key = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', key);
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', key);
      document.body.style.overflow = old;
    };
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div
      className="modal-shade"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <section
        className={`modal modal-${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <header className="modal-header">
          <div>
            <h2 id="modal-title">{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <IconButton icon={X} label="Cerrar" onClick={onClose} />
        </header>
        <div className="modal-content">{children}</div>
        {footer && <footer className="modal-footer">{footer}</footer>}
      </section>
    </div>,
    document.body,
  );
}
export function StatusBadge({ status }) {
  return (
    <span className={`status-badge status-${String(status).toLowerCase().replaceAll(' ', '-')}`}>
      <i />
      {status}
    </span>
  );
}
export function FormField({ label, error, hint, id, children, required }) {
  return (
    <div className={`form-field ${error ? 'has-error' : ''}`}>
      <label htmlFor={id}>
        {label}
        {required && <i> · requerido</i>}
      </label>
      {children}
      {error ? (
        <span className="field-error">
          <CircleAlert size={13} />
          {error}
        </span>
      ) : (
        hint && <small>{hint}</small>
      )}
    </div>
  );
}
export function SearchInput({ value, onChange, placeholder = 'Buscar…', className = '' }) {
  return (
    <label className={`search-input ${className}`}>
      <span className="search-glyph">⌕</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      {value && (
        <button type="button" aria-label="Limpiar búsqueda" onClick={() => onChange('')}>
          ×
        </button>
      )}
    </label>
  );
}
export function FilterPill({ active, children, ...props }) {
  return (
    <button className={`filter-pill ${active ? 'active' : ''}`} {...props}>
      {children}
    </button>
  );
}
export function Dropdown({ value, onChange, options, label }) {
  return (
    <label className="select-wrap">
      {label && <span className="sr-only">{label}</span>}
      <select value={value} onChange={onChange}>
        {options.map((option) => (
          <option value={option.value} key={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown size={14} />
    </label>
  );
}
export function Pagination({ page, pageSize, count, onChange }) {
  const pages = Math.max(1, Math.ceil(count / pageSize));
  return (
    <div className="pagination">
      <span>
        Mostrando{' '}
        <b>
          {count ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, count)}
        </b>{' '}
        de <b>{count}</b>
      </span>
      <div>
        <button
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          aria-label="Página anterior"
        >
          <ChevronLeft size={16} />
        </button>
        <span>
          {page} / {pages}
        </span>
        <button
          onClick={() => onChange(Math.min(pages, page + 1))}
          disabled={page >= pages}
          aria-label="Página siguiente"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
export function Toggle({ checked, onChange, label, description }) {
  return (
    <label className="toggle-row">
      <span>
        <b>{label}</b>
        {description && <small>{description}</small>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`toggle ${checked ? 'on' : ''}`}
      >
        <i />
      </button>
    </label>
  );
}
export function OrderStateHelp({ status }) {
  return createElement('small', { className: 'state-help' }, ORDER_HELP[status]);
}
