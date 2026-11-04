import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowDownWideNarrow,
  ArrowRight,
  BadgeCheck,
  Ban,
  CalendarDays,
  Check,
  CircleAlert,
  Clock3,
  FileText,
  MapPin,
  MessageSquareText,
  MoreHorizontal,
  Package,
  PackageCheck,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
  UserRound,
  X,
} from 'lucide-react';
import { useOrder, useOrderAction, useOrders } from '../../shared/hooks/useData.js';
import {
  DEFAULT_CHANNEL,
  formatCustomerReference,
  getChannel,
  ORDER_STATUS,
  ORDER_TRANSITIONS,
  PAGE_SIZE,
} from '../../shared/lib/contracts.js';
import { formatCOP, formatDateTime } from '../../shared/lib/format.js';
import {
  Button,
  FilterPill,
  IconButton,
  Modal,
  OrderStateHelp,
  PageTitle,
  Pagination,
  SearchInput,
  StatusBadge,
} from '../../shared/ui/Components.jsx';
import {
  EmptyState,
  ErrorState,
  Skeleton,
  emptyBusqueda,
  emptyPedidos,
} from '../../shared/ui/Feedback.jsx';
import { useToast } from '../../app/providers.jsx';

export function OrdersPage() {
  const [params, setParams] = useSearchParams();
  const [status, setStatus] = useState(params.get('estado') || 'Todos'),
    [query, setQuery] = useState(''),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState(params.get('pedido') || ''),
    [cancelOrder, setCancelOrder] = useState(null),
    [reason, setReason] = useState(''),
    [newIds, setNewIds] = useState(() => new Set());
  const previous = useRef({ key: null, ids: new Set() });
  const queryArgs = useMemo(
    () => ({ status, query, page, pageSize: PAGE_SIZE }),
    [status, query, page],
  );
  const result = useOrders(queryArgs),
    action = useOrderAction();
  const toast = useToast();
  const detail = useOrder(selected);
  useEffect(() => {
    if (!result.data || result.isPlaceholderData) return;
    const key = JSON.stringify([status, query, page]);
    const ids = new Set((result.data.items || []).map((order) => order.id));
    if (previous.current.key !== key) {
      previous.current = { key, ids };
      setNewIds(new Set());
      return;
    }
    const fresh = [...ids].filter((id) => !previous.current.ids.has(id));
    if (fresh.length) setNewIds((current) => new Set([...current, ...fresh]));
    previous.current = { key, ids: new Set([...previous.current.ids, ...ids]) };
  }, [result.data, result.isPlaceholderData, status, query, page]);
  const statuses = ['Todos', ...ORDER_STATUS];
  const update = (next) => {
    setStatus(next);
    setPage(1);
    setParams(next === 'Todos' ? {} : { estado: next });
  };
  async function transition(order, next) {
    if (next === 'Cancelado') {
      setCancelOrder(order);
      setReason('');
      return;
    }
    try {
      await action.mutateAsync({ id: order.id, status: next });
    } catch (error) {
      toast(error.message, 'error');
    }
  }
  function closeDetails() {
    setSelected('');
    const next = {};
    if (status !== 'Todos') next.estado = status;
    setParams(next);
  }
  const data = result.data,
    orders = data?.items || [];
  const selectedOrder = detail.data;
  return (
    <div className="page-enter orders-page">
      <PageTitle
        eyebrow="ORDEN Y CLARIDAD, PEDIDO A PEDIDO"
        title={
          <>
            Tus pedidos, <em>en buenas manos.</em>
          </>
        }
        description="Cada solicitud llega ordenada para que puedas decidir qué sigue."
        actions={
          <>
            <span className="count-chip">
              <span />
              {data?.count ?? 0} en tu tienda
            </span>
            <Button icon={RefreshCw} onClick={() => result.refetch()}>
              Actualizar
            </Button>
          </>
        }
      />
      <section className="orders-intro">
        <div className="orders-intro-mark">
          <ShoppingBag size={18} />
          <span className="intro-spark">✳</span>
        </div>
        <div>
          <b>Un paso a la vez.</b>
          <p>
            Puedes avanzar un pedido solo a un estado permitido. Si lo cancelas, quedará registrado
            en su historial.
          </p>
        </div>
        <div className="orders-intro-stat">
          <strong>{data?.count ?? '—'}</strong>
          <small>pedidos registrados</small>
        </div>
      </section>
      <section className="surface orders-surface">
        <div className="orders-toolbar">
          <SearchInput
            value={query}
            onChange={(v) => {
              setQuery(v);
              setPage(1);
            }}
            placeholder="Busca por número o nombre de cliente…"
          />
          <div className="filter-strip">
            {statuses.map((s) => (
              <FilterPill key={s} active={status === s} onClick={() => update(s)}>
                {s}
                {s === 'Pendiente' && (
                  <i className="filter-count">
                    {data?.count && status === 'Pendiente' ? data.count : ''}
                  </i>
                )}
              </FilterPill>
            ))}
          </div>
        </div>
        {result.isLoading ? (
          <Skeleton rows={7} />
        ) : result.error ? (
          <ErrorState error={result.error} onRetry={result.refetch} />
        ) : orders.length ? (
          <>
            <div className="orders-table-wrap">
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>Pedido</th>
                    <th>Cliente</th>
                    <th>Cuándo</th>
                    <th>Entrega y pago</th>
                    <th>Estado</th>
                    <th>Total</th>
                    <th>
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order, i) => (
                    <OrderRow
                      key={order.id}
                      order={order}
                      index={(page - 1) * PAGE_SIZE + i}
                      pending={action.isPending}
                      isNew={newIds.has(order.id)}
                      onOpen={() => {
                        setNewIds((current) => {
                          const next = new Set(current);
                          next.delete(order.id);
                          return next;
                        });
                        setSelected(order.id);
                        setParams({ ...Object.fromEntries(params), pedido: order.id });
                      }}
                      onTransition={(next) => transition(order, next)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="order-mobile-list">
              {orders.map((order, i) => (
                <OrderMobileCard
                  key={order.id}
                  order={order}
                  index={(page - 1) * PAGE_SIZE + i}
                  isNew={newIds.has(order.id)}
                  onOpen={() => {
                    setNewIds((current) => {
                      const next = new Set(current);
                      next.delete(order.id);
                      return next;
                    });
                    setSelected(order.id);
                    setParams({ ...Object.fromEntries(params), pedido: order.id });
                  }}
                  onTransition={(next) => transition(order, next)}
                />
              ))}
            </div>
            <Pagination page={page} pageSize={PAGE_SIZE} count={data.count} onChange={setPage} />
          </>
        ) : (
          <EmptyState
            illustration={query ? emptyBusqueda : emptyPedidos}
            icon={Search}
            title={query ? 'No encontramos ese pedido.' : 'Todavía no hay pedidos en esta lista.'}
            description={
              query
                ? 'Prueba con otro número o nombre.'
                : 'Cuando un cliente confirme por WhatsApp, el pedido llegará aquí.'
            }
            action={query && <Button onClick={() => setQuery('')}>Limpiar búsqueda</Button>}
          />
        )}
      </section>
      <OrderDetail
        order={selectedOrder}
        loading={detail.isLoading}
        error={detail.error}
        onClose={closeDetails}
        onRetry={detail.refetch}
        onTransition={(next) => selectedOrder && transition(selectedOrder, next)}
        pending={action.isPending}
      />
      <Modal
        open={!!cancelOrder}
        title={`Cancelar ${cancelOrder?.id || 'pedido'}`}
        description="El pedido ya no podrá avanzar a otro estado."
        onClose={() => setCancelOrder(null)}
        size="small"
        footer={
          <>
            <Button onClick={() => setCancelOrder(null)}>Volver</Button>
            <Button
              variant="danger"
              icon={Ban}
              loading={action.isPending}
              onClick={async () => {
                try {
                  await action.mutateAsync({ id: cancelOrder.id, status: 'Cancelado', reason });
                  setCancelOrder(null);
                } catch (error) {
                  toast(error.message, 'error');
                }
              }}
            >
              Sí, cancelar
            </Button>
          </>
        }
      >
        <div className="cancel-warning">
          <CircleAlert size={18} />
          <p>
            Esta decisión se guardará en el historial del pedido. El sistema intentará notificar al
            cliente según la configuración del comercio.
          </p>
        </div>
        <label className="form-field">
          <span>
            Motivo <i>· obligatorio</i>
          </span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={200}
            rows={3}
            placeholder="Ej. El cliente decidió cancelar"
          />
        </label>
      </Modal>
      {action.error && (
        <div className="mutation-error" role="alert">
          <CircleAlert size={15} />
          {action.error.message}
        </div>
      )}
    </div>
  );
}

function OrderRow({ order, index, onOpen, onTransition, pending, isNew }) {
  const next = ORDER_TRANSITIONS[order.estado] || [];
  const customer =
    order.autorizado && order.cliente
      ? order.cliente
      : formatCustomerReference({
          channel: order.canal,
          reference: order.cliente_ref || order.telefono,
          authorized: order.autorizado,
          anonymized: order.anonimizado,
        });
  return (
    <tr className={`order-row ${isNew ? 'order-new' : ''}`}>
      <td>
        <button className="order-id-button" onClick={onOpen}>
          <span className={`row-index idx-${order.estado.toLowerCase()}`}>
            {String(index + 1).padStart(2, '0')}
          </span>
          <span>
            <b>{order.id}</b>
            {isNew && <small className="new-order-label">Nuevo · recibido recientemente</small>}
            <small>
              {getChannel(order.canal).label} · {order.items?.length || 0} artículos
            </small>
          </span>
        </button>
      </td>
      <td>
        <span className="customer-name">{customer || 'Cliente anonimizado'}</span>
        <small className="customer-phone">
          {order.autorizado
            ? formatCustomerReference({
                channel: order.canal,
                reference: order.cliente_ref || order.telefono,
                authorized: true,
                anonymized: order.anonimizado,
              })
            : 'Información protegida por privacidad'}
        </small>
      </td>
      <td>
        <span className="date-cell">{formatDateTime(order.creado_en)}</span>
      </td>
      <td>
        <span className="delivery-cell">
          {order.entrega === 'domicilio' ? <MapPin size={13} /> : <Package size={13} />}{' '}
          {order.entrega === 'domicilio' ? 'Domicilio' : 'Recogida'}
        </span>
        <small className="customer-phone">
          {String(order.pago || '').replace(/^./, (s) => s.toUpperCase())}
        </small>
      </td>
      <td>
        <StatusBadge status={order.estado} />
        {order.aviso === 'no enviado' && <small className="notice-failed">Aviso no enviado</small>}
      </td>
      <td className="order-total">{formatCOP(order.total)}</td>
      <td>
        <div className="row-action-group">
          <button className="row-open-action" onClick={onOpen}>
            Detalle <ArrowRight size={13} />
          </button>
          {next.includes('Procesado') && (
            <button
              className="quick-accept"
              onClick={() => onTransition('Procesado')}
              disabled={pending}
            >
              Procesar
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
function OrderMobileCard({ order, index, onOpen, onTransition, isNew }) {
  const next = ORDER_TRANSITIONS[order.estado] || [];
  const customer = formatCustomerReference({
    channel: order.canal,
    reference: order.cliente_ref || order.telefono,
    authorized: order.autorizado,
    anonymized: order.anonimizado,
  });
  return (
    <article className="mobile-order-card">
      <div className="mobile-order-top">
        <span className={`row-index idx-${order.estado.toLowerCase()}`}>
          {String(index + 1).padStart(2, '0')}
        </span>
        <button onClick={onOpen}>
          <b>
            {order.id}
            {isNew && <i className="new-order-pill">Nuevo</i>}
          </b>
          <small>{formatDateTime(order.creado_en)}</small>
        </button>
        <StatusBadge status={order.estado} />
      </div>
      <div className="mobile-order-middle">
        <b>{customer}</b>
        <strong>{formatCOP(order.total)}</strong>
      </div>
      <div className="mobile-order-bottom">
        <span>
          {order.entrega === 'domicilio' ? 'Domicilio' : 'Recogida'} · {order.pago}
        </span>
        <div>
          {next.includes('Procesado') && (
            <button className="quick-accept" onClick={() => onTransition('Procesado')}>
              Procesar
            </button>
          )}
          <button className="row-open-action" onClick={onOpen}>
            Ver pedido <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </article>
  );
}

function OrderDetail({ order, loading, error, onClose, onRetry, onTransition, pending }) {
  return (
    <Modal
      open={!!order || loading || !!error}
      onClose={onClose}
      title={order ? `Pedido ${order.id}` : 'Detalle del pedido'}
      description="El detalle conserva exactamente lo que el cliente confirmó."
      size="large"
    >
      {loading ? (
        <Skeleton rows={7} />
      ) : error ? (
        <ErrorState error={error} onRetry={onRetry} />
      ) : (
        order && (
          <div className="order-detail">
            <div className="detail-topline">
              <div>
                <StatusBadge status={order.estado} />
                <span className="detail-date">
                  <CalendarDays size={13} />
                  {formatDateTime(order.creado_en)}
                </span>
              </div>
              <OrderStateHelp status={order.estado} />
            </div>
            {order.aviso === 'no enviado' && (
              <div className="notice-box notice-amber">
                <CircleAlert size={16} />
                <span>
                  <b>No se pudo enviar el aviso.</b> El pedido sí quedó guardado. El equipo debe
                  revisar la entrega del aviso por el canal configurado.
                </span>
              </div>
            )}
            <div className="detail-grid">
              <div className="detail-block">
                <div className="detail-block-head">
                  <span className="detail-icon">
                    <UserRound size={15} />
                  </span>
                  <b>Cliente</b>
                </div>
                <strong>
                  {order.autorizado && order.cliente && !order.anonimizado
                    ? order.cliente
                    : formatCustomerReference({
                        channel: order.canal,
                        reference: order.cliente_ref || order.telefono,
                        authorized: order.autorizado,
                        anonymized: order.anonimizado,
                      })}
                </strong>
                <small>
                  {order.autorizado
                    ? formatCustomerReference({
                        channel: order.canal,
                        reference: order.cliente_ref || order.telefono,
                        authorized: true,
                        anonymized: order.anonimizado,
                      })
                    : 'Información protegida por privacidad'}
                </small>
              </div>
              <div className="detail-block">
                <div className="detail-block-head">
                  <span className="detail-icon">
                    <MapPin size={15} />
                  </span>
                  <b>Entrega</b>
                </div>
                <strong>
                  {order.entrega === 'domicilio' ? 'Domicilio' : 'Recogida en tienda'}
                </strong>
                <small>
                  {order.autorizado
                    ? order.direccion || 'Dirección no disponible'
                    : 'Datos protegidos'}
                </small>
              </div>
              <div className="detail-block">
                <div className="detail-block-head">
                  <span className="detail-icon">
                    <BadgeCheck size={15} />
                  </span>
                  <b>Forma de pago</b>
                </div>
                <strong>{order.pago === 'transferencia' ? 'Transferencia' : 'Efectivo'}</strong>
                <small>
                  {order.pago === 'transferencia'
                    ? 'Verifica el pago antes de confirmar.'
                    : 'Se cobra al entregar o recoger.'}
                </small>
              </div>
              <div className="detail-block">
                <div className="detail-block-head">
                  <span className="detail-icon">
                    <MessageSquareText size={15} />
                  </span>
                  <b>Origen</b>
                </div>
                <strong>{getChannel(order.canal).label}</strong>
                <small>
                  {order.conversation_id ? 'Conversación vinculada' : 'Sin conversación vinculada'}
                </small>
              </div>
            </div>
            <div className="detail-section">
              <div className="detail-section-title">
                <h3>Lo que pidió</h3>
                <span>
                  {order.autorizado
                    ? (order.items?.length || 0) + ' artículos'
                    : 'Contenido no disponible'}
                </span>
              </div>
              {order.autorizado ? (
                (order.items || []).map((item, i) => (
                  <div className="line-item" key={`${item.nombre}-${i}`}>
                    <span className="line-item-number">{String(i + 1).padStart(2, '0')}</span>
                    <div className="line-item-main">
                      <b>
                        {item.cantidad} × {item.nombre || item.nombre_producto}
                      </b>
                      {item.especificacion && <small>{item.especificacion}</small>}
                    </div>
                    <strong>{formatCOP((item.precio_unitario || 0) * item.cantidad)}</strong>
                  </div>
                ))
              ) : (
                <div className="privacy-quiet">
                  <ShieldCheck size={16} />
                  El contenido del pedido está oculto por privacidad.
                </div>
              )}
              <div className="detail-grand-total">
                <span>Total registrado</span>
                <strong>{formatCOP(order.total)}</strong>
              </div>
            </div>
            {order.autorizado && order.conversacion?.messages?.length > 0 && (
              <div className="detail-section">
                <div className="detail-section-title">
                  <h3>Conversación asociada</h3>
                  <span>Solo lectura</span>
                </div>
                <div className="order-conversation">
                  {order.conversacion.messages.slice(-6).map((message, i) => (
                    <div
                      className={`order-message ${message.autor === 'dueño' ? 'owner' : ''}`}
                      key={`${message.fecha}-${i}`}
                    >
                      <b>
                        {message.autor === 'cliente'
                          ? 'Cliente'
                          : message.autor === 'bot'
                            ? 'Asistente'
                            : 'Tú'}
                      </b>
                      <p>{message.contenido}</p>
                      <small>{formatDateTime(message.fecha)}</small>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="detail-section">
              <div className="detail-section-title">
                <h3>Historial del pedido</h3>
                <span>{order.historial?.length || 0} movimientos</span>
              </div>
              <div className="history-timeline">
                {(order.historial || []).map((entry, i) => (
                  <div className="history-entry" key={`${entry.fecha}-${i}`}>
                    <span className="history-marker" />
                    <div className="history-entry-body">
                      <b>{entry.estado_nuevo || entry.estado}</b>
                      <small>
                        {formatDateTime(entry.fecha)} · {entry.usuario || 'Sistema'}
                        {entry.motivo && ` · ${entry.motivo}`}
                      </small>
                    </div>
                    {i === order.historial.length - 1 && <i className="history-current">Actual</i>}
                  </div>
                ))}
              </div>
            </div>
            <div className="detail-footer-actions">
              <span>
                <ShieldCheck size={14} />
                El historial solo se amplía; no se edita.
              </span>
              <div>
                {(ORDER_TRANSITIONS[order.estado] || []).map((next) => (
                  <Button
                    key={next}
                    variant={
                      next === 'Cancelado' ? 'danger' : next === 'Confirmado' ? 'primary' : 'soft'
                    }
                    size="small"
                    loading={pending}
                    onClick={() => onTransition(next)}
                  >
                    {next === 'Cancelado' ? 'Cancelar pedido' : `Marcar ${next.toLowerCase()}`}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )
      )}
    </Modal>
  );
}
