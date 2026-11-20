import { useMemo } from 'react';
import { useAuth } from '../../app/providers.jsx';
import { useNavigate } from 'react-router-dom';
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BellRing,
  CalendarDays,
  Check,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  PackageCheck,
  PackageSearch,
  Plus,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import {
  useOrderMetrics,
  useOrders,
  usePendingAlerts,
  useProducts,
} from '../../shared/hooks/useData.js';
import { formatCOP, formatDateTime } from '../../shared/lib/format.js';
import { Button, StatusBadge } from '../../shared/ui/Components.jsx';
import { EmptyState, ErrorState, Skeleton, emptyPedidos } from '../../shared/ui/Feedback.jsx';
import { PageTitle } from '../../shared/ui/Components.jsx';

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    data: metrics,
    isLoading: metricsLoading,
    error: metricsError,
    refetch,
  } = useOrderMetrics();
  const { data: ordersData, isLoading: ordersLoading } = useOrders({ page: 1, pageSize: 5 });
  const { data: alertCount = 0 } = usePendingAlerts();
  const { data: products = [] } = useProducts();
  const recent = ordersData?.items || [];
  const unavailable = products.filter((p) => p.disponibilidad === 'agotado').length;
  const chart = useMemo(() => {
    const base = metrics?.byDay || [];
    const max = Math.max(1, ...base.map((d) => d.value));
    return base.map((d, i) => ({
      ...d,
      height: Math.max(8, Math.round((d.value / max) * 100)),
      day: new Intl.DateTimeFormat('es-CO', { weekday: 'short', timeZone: 'America/Bogota' })
        .format(new Date(d.date))
        .replace('.', ''),
      active: i === base.length - 1,
    }));
  }, [metrics]);
  return (
    <div className="page-enter dashboard-page">
      <PageTitle
        eyebrow={new Intl.DateTimeFormat('es-CO', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          timeZone: 'America/Bogota',
        })
          .format(new Date())
          .toLocaleUpperCase('es-CO')}
        title={
          <>
            Tu tienda, <em>en su mejor ritmo.</em>
          </>
        }
        description="Lo que está pasando hoy, reunido en un solo lugar."
        actions={
          <>
            <span className="last-sync">
              <span /> Actualizado ahora
            </span>
            <Button icon={RefreshCw} onClick={() => refetch()}>
              Actualizar
            </Button>
          </>
        }
      />
      <section className="welcome-panel">
        <div className="welcome-copy">
          <span className="welcome-kicker">
            <Sparkles size={13} /> UN BUEN DÍA PARA VENDER
          </span>
          <h2>
            Hola, {user?.name?.split(' ')[0] || 'bienvenida'}
            <span className="wave">✳</span>
          </h2>
          <p>
            Tu tienda está abierta para atender. Hay <b>{metrics?.pending ?? '—'} pedidos</b> por
            revisar y{' '}
            {alertCount > 0 ? (
              <>
                <b>{alertCount} alertas</b> que necesitan tu atención
              </>
            ) : (
              'todo está al día en tu bandeja'
            )}
            .
          </p>
          <div className="welcome-actions">
            <Button
              variant="light"
              icon={ShoppingBag}
              onClick={() => navigate('/pedidos?estado=Pendiente')}
            >
              Revisar pedidos <ArrowRight size={15} />
            </Button>
            <button className="welcome-text-link" onClick={() => navigate('/atencion')}>
              Ver bandeja <ChevronRight size={14} />
            </button>
          </div>
        </div>
        <div className="welcome-visual" aria-hidden="true">
          <div className="welcome-circle circle-back" />
          <div className="welcome-circle circle-front" />
          <div className="welcome-glow" />
          <div className="float-card float-order">
            <span className="float-icon">
              <PackageCheck size={16} />
            </span>
            <span>
              <b>Pedido confirmado</b>
              <small>Todo listo para entregar</small>
            </span>
            <span className="float-check">
              <Check size={13} />
            </span>
          </div>
          <div className="float-card float-metric">
            <span className="float-spark">
              <TrendingUp size={14} />
            </span>
            <span>
              <b>{metrics?.total ?? 0}</b>
              <small>pedidos organizados</small>
            </span>
          </div>
          <div className="visual-star star-a">✳</div>
          <div className="visual-star star-b">✦</div>
          <div className="visual-loop" />
        </div>
        <div className="welcome-index">
          <span>01</span>
          <i />
        </div>
      </section>
      <section className="metric-grid">
        {metricsError ? (
          <ErrorState error={metricsError} onRetry={refetch} />
        ) : metricsLoading ? (
          <Skeleton rows={2} />
        ) : (
          <>
            <MetricCard
              label="Por revisar"
              value={metrics?.pending ?? 0}
              icon={Clock3}
              tone="amber"
              foot="Hay pedidos que esperan tu visto bueno"
              onClick={() => navigate('/pedidos?estado=Pendiente')}
            />
            <MetricCard
              label="Venta confirmada hoy"
              value={formatCOP(metrics?.confirmedToday)}
              icon={CircleDollarSign}
              tone="mint"
              foot="Solo cuenta pedidos confirmados"
            />
            <MetricCard
              label="Pedidos de hoy"
              value={metrics?.completedToday ?? 0}
              icon={PackageCheck}
              tone="blue"
              foot="Tienes el control de cada entrega"
            />
            <MetricCard
              label="Necesitan atención"
              value={alertCount}
              icon={BellRing}
              tone="rose"
              foot="Conversaciones y solicitudes pendientes"
              onClick={() => navigate('/atencion')}
            />
          </>
        )}
      </section>
      <section className="dashboard-grid">
        <article className="surface chart-panel">
          <div className="section-heading">
            <div>
              <span className="section-eyebrow">EL PULSO DE TU TIENDA</span>
              <h3>Pedidos con buen ritmo</h3>
              <p>Ventas confirmadas durante los últimos 7 días</p>
            </div>
            <span className="chart-total">
              <b>{formatCOP(metrics?.confirmedToday || 0)}</b>
              <small>hoy</small>
            </span>
          </div>
          {metricsLoading ? (
            <div className="chart-placeholder">
              <Skeleton rows={4} />
            </div>
          ) : (
            <div className="chart-area">
              <div className="chart-y-labels">
                <span>100k</span>
                <span>75k</span>
                <span>50k</span>
                <span>25k</span>
                <span>0</span>
              </div>
              <div className="chart-plot">
                <div className="chart-guides">
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
                <div className="chart-bars">
                  {chart.map((day) => (
                    <div
                      className={`chart-day ${day.active ? 'is-today' : ''}`}
                      key={day.date}
                      title={`${day.day}: ${formatCOP(day.value)}`}
                    >
                      <div className="bar-stack">
                        <span className="bar-value">{day.value ? formatCOP(day.value) : '$0'}</span>
                        <i style={{ '--bar-height': `${day.height}%` }} />
                        <i
                          className="bar-secondary"
                          style={{ '--bar-height': `${Math.max(4, day.height * 0.55)}%` }}
                        />
                      </div>
                      <small>{day.day}</small>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <div className="chart-legend">
            <span>
              <i className="legend-dot main" />
              Confirmados
            </span>
            <span>
              <i className="legend-dot second" />
              Pedidos recibidos
            </span>
            <button onClick={() => navigate('/pedidos')}>
              Ver actividad <ArrowRight size={13} />
            </button>
          </div>
        </article>
        <article className="surface attention-panel">
          <div className="section-heading">
            <div>
              <span className="section-eyebrow">ESTAMOS CONTIGO</span>
              <h3>Para atender ahora</h3>
              <p>Lo que necesita tu atención humana</p>
            </div>
            <span className="attention-number">{alertCount.toString().padStart(2, '0')}</span>
          </div>
          <div className="attention-orbit">
            <div className="attention-orbit-inner">
              <BellRing size={20} />
              <span>
                {alertCount
                  ? `${alertCount} pendiente${alertCount === 1 ? '' : 's'}`
                  : 'Sin pendientes'}
              </span>
            </div>
            <i />
            <b />
          </div>
          <div className="attention-foot">
            <p>
              {alertCount
                ? 'Tus clientes están esperando una respuesta cercana.'
                : 'Por ahora, todo está en buenas manos.'}
            </p>
            <Button variant="dark" onClick={() => navigate('/atencion')}>
              Abrir bandeja <ArrowRight size={15} />
            </Button>
          </div>
        </article>
      </section>
      <section className="lower-grid">
        <article className="surface orders-panel">
          <div className="section-heading section-heading-row">
            <div>
              <span className="section-eyebrow">RECIÉN LLEGADOS</span>
              <h3>Los pedidos más recientes</h3>
            </div>
            <button className="text-action" onClick={() => navigate('/pedidos')}>
              Ver todos <ArrowRight size={14} />
            </button>
          </div>
          {ordersLoading ? (
            <Skeleton rows={5} />
          ) : recent.length ? (
            <div className="recent-list">
              {recent.map((order, i) => (
                <RecentOrder
                  key={order.id}
                  order={order}
                  index={i}
                  onClick={() => navigate(`/pedidos?pedido=${encodeURIComponent(order.id)}`)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              illustration={emptyPedidos}
              icon={PackageSearch}
              title="Aún no llegan pedidos"
              description="Cuando un cliente confirme su pedido, aparecerá aquí."
            />
          )}
        </article>
        <article className="surface catalog-snapshot">
          <div className="section-heading section-heading-row">
            <div>
              <span className="section-eyebrow">TU MOSTRADOR DIGITAL</span>
              <h3>Catálogo</h3>
            </div>
            <button
              className="round-add"
              aria-label="Abrir catálogo"
              onClick={() => navigate('/catalogo')}
            >
              <ArrowRight size={16} />
            </button>
          </div>
          <div className="catalog-snapshot-inner">
            <div className="catalog-count">
              <strong>{products.length}</strong>
              <span>productos en tu catálogo</span>
            </div>
            <div className="catalog-status-lines">
              <div>
                <span className="dot dot-green" />
                <span>Disponibles</span>
                <b>{products.filter((p) => p.disponibilidad === 'disponible').length}</b>
              </div>
              <div>
                <span className="dot dot-amber" />
                <span>Agotados</span>
                <b>{unavailable}</b>
              </div>
            </div>
          </div>
          {unavailable > 0 && (
            <button
              className="stock-alert"
              onClick={() => navigate('/catalogo?disponibilidad=agotado')}
            >
              <span className="stock-alert-glyph">!</span>
              <span>
                <b>
                  {unavailable} producto{unavailable === 1 ? '' : 's'} agotado
                  {unavailable === 1 ? '' : 's'}
                </b>
                <small>Actualiza la disponibilidad del catálogo</small>
              </span>
              <ChevronRight size={16} />
            </button>
          )}
          <button className="catalog-link" onClick={() => navigate('/catalogo')}>
            Administrar productos <ArrowRight size={14} />
          </button>
        </article>
      </section>
    </div>
  );
}
function MetricCard({ label, value, icon: Icon, tone, foot, onClick }) {
  return (
    <article onClick={onClick} className={`metric-card ${onClick ? 'clickable' : ''}`}>
      <div className="metric-top">
        <span>{label}</span>
        <i className={`metric-icon tone-${tone}`}>
          <Icon size={17} />
        </i>
      </div>
      <strong>{value}</strong>
      <small>{foot}</small>
      <span className="metric-halo" />
    </article>
  );
}
function RecentOrder({ order, index, onClick }) {
  const label = order.autorizado ? order.cliente : 'Cliente anonimizado';
  return (
    <button className="recent-row" onClick={onClick}>
      <span className={`recent-index recent-${order.estado.toLowerCase()}`}>
        {String(index + 1).padStart(2, '0')}
      </span>
      <span className="recent-main">
        <b>
          {order.id} <i>·</i> {label}
        </b>
        <small>
          {formatDateTime(order.creado_en)} <i>·</i>{' '}
          {order.entrega === 'domicilio' ? 'Domicilio' : 'Recogida en tienda'}
        </small>
      </span>
      <StatusBadge status={order.estado} />
      <strong className="recent-total">{formatCOP(order.total)}</strong>
      <ArrowRight size={15} className="recent-arrow" />
    </button>
  );
}
