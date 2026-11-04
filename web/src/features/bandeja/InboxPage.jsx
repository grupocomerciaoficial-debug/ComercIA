import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Check,
  CheckCheck,
  ChevronRight,
  CircleHelp,
  Clock3,
  MessageCircle,
  Send,
  ShieldAlert,
  ShieldCheck,
  UserRound,
  UserRoundCheck,
  X,
} from 'lucide-react';
import { useAlertAction, useAlerts, useMessageAction } from '../../shared/hooks/useData.js';
import { formatDateTime, formatRelative } from '../../shared/lib/format.js';
import { Button, Modal, PageTitle, StatusBadge } from '../../shared/ui/Components.jsx';
import { EmptyState, ErrorState, Skeleton, emptyInbox } from '../../shared/ui/Feedback.jsx';
import { useToast } from '../../app/providers.jsx';
import { formatCustomerReference } from '../../shared/lib/contracts.js';

const labels = {
  persona: 'Hablar con una persona',
  sin_autorizacion: 'Sin autorización de tratamiento',
  solicitud: 'Solicitud sobre un pedido',
};
const icons = { persona: UserRoundCheck, sin_autorizacion: ShieldAlert, solicitud: CircleHelp };

export function InboxPage() {
  const [params, setParams] = useSearchParams();
  const query = useAlerts();
  const items = query.data || [];
  const [active, setActive] = useState(params.get('alerta') || '');
  const [text, setText] = useState('');
  const [resolve, setResolve] = useState(null);
  const [decision, setDecision] = useState(null);
  const resolveAction = useAlertAction('resolve');
  const requestAction = useAlertAction('request');
  const messageAction = useMessageAction();
  const toast = useToast();
  const current = items.find((alert) => alert.id === active) || items[0] || null;
  const sendUrlConfigured = Boolean(import.meta.env.VITE_N8N_PANEL_ENVIAR_URL?.trim());

  function select(alert) {
    setActive(alert.id);
    setParams({ alerta: alert.id });
    setText('');
  }

  async function markAttended() {
    try {
      await resolveAction.mutateAsync({
        id: resolve.id,
        type: resolve.tipo,
        conversationId: resolve.conversacion_id,
      });
      toast(resolve.tipo === 'persona' ? 'Atención finalizada.' : 'Alerta marcada como atendida.');
      setResolve(null);
      if (active === resolve.id) setActive('');
    } catch (error) {
      toast(error.message, 'error');
    }
  }

  async function decideRequest() {
    if (!decision.alert.solicitud_id) {
      toast(
        'No encontramos la solicitud vinculada. Actualiza la bandeja e inténtalo de nuevo.',
        'error',
      );
      return;
    }
    try {
      const result = await requestAction.mutateAsync({
        solicitudId: decision.alert.solicitud_id,
        decision: decision.value,
      });
      toast(
        result?.avisar_cliente
          ? `Solicitud ${decision.value === 'aceptada' ? 'aceptada' : 'rechazada'}. Se solicitará el aviso al cliente.`
          : `Solicitud ${decision.value === 'aceptada' ? 'aceptada' : 'rechazada'}.`,
      );
      setDecision(null);
    } catch (error) {
      toast(error.message, 'error');
    }
  }

  async function sendMessage(event) {
    event.preventDefault();
    if (!text.trim() || !current?.conversacion_id) return;
    try {
      await messageAction.mutateAsync({ id: current.conversacion_id, text: text.trim() });
      setText('');
      toast('Respuesta enviada al cliente.');
    } catch (error) {
      toast(error.message, 'error');
    }
  }

  return (
    <div className="page-enter inbox-page">
      <PageTitle
        eyebrow="LA ATENCIÓN QUE MARCA LA DIFERENCIA"
        title={
          <>
            Una persona, <em>de verdad presente.</em>
          </>
        }
        description="Aquí llegan las conversaciones que quieren encontrarte a ti."
        actions={
          <>
            <span className="count-chip count-alert">
              <i />
              {items.length} por atender
            </span>
            <Button onClick={() => query.refetch()} icon={CheckCheck}>
              Actualizar
            </Button>
          </>
        }
      />
      <section className="inbox-ribbon">
        <div className="ribbon-wave">
          <span />
          <span />
          <span />
        </div>
        <div>
          <b>Un buen mensaje puede cambiar el día.</b>
          <p>Revisa la conversación, conoce el contexto y responde con tu propia voz.</p>
        </div>
        <span className="ribbon-count">
          {String(items.length).padStart(2, '0')} <small>pendientes</small>
        </span>
      </section>
      <section className="inbox-layout">
        <aside className="inbox-queue">
          <div className="queue-head">
            <div>
              <span className="section-eyebrow">TU FILA DE ATENCIÓN</span>
              <h3>Lo que espera respuesta</h3>
            </div>
            <span className="queue-number">{items.length}</span>
          </div>
          {query.isLoading ? (
            <Skeleton rows={5} />
          ) : query.error ? (
            <ErrorState error={query.error} onRetry={query.refetch} />
          ) : items.length ? (
            items.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                active={current?.id === alert.id}
                onClick={() => select(alert)}
              />
            ))
          ) : (
            <div className="queue-empty">
              <img src={emptyInbox} alt="Bandeja al día" className="queue-empty-illustration" />
              <b>Todo tranquilo</b>
              <small>Cuando alguien necesite atención, llegará aquí.</small>
            </div>
          )}
          <div className="queue-privacy-note">
            <ShieldCheck size={14} />
            <span>Las conversaciones sin autorización no muestran su contenido.</span>
          </div>
        </aside>
        <article className="conversation-panel">
          {current ? (
            <>
              <header className="conversation-head">
                <div className={`conversation-person-icon type-${current.tipo}`}>
                  <UserRound size={18} />
                </div>
                <div className="conversation-contact">
                  <b>
                    {formatCustomerReference({
                      channel: current.canal,
                      reference: current.cliente_ref,
                      authorized: current.autorizado,
                    })}
                  </b>
                  <small>
                    {labels[current.tipo]} · {formatRelative(current.creado_en)}
                  </small>
                </div>
                <div className="conversation-head-actions">
                  <span className="conversation-live">
                    <i />
                    Pendiente
                  </span>
                  {current.tipo !== 'solicitud' && (
                    <button
                      className="icon-button"
                      title="Marcar como atendida"
                      aria-label="Marcar como atendida"
                      onClick={() => setResolve(current)}
                    >
                      <Check size={17} />
                    </button>
                  )}
                </div>
              </header>
              <div className="conversation-context">
                {current.tipo === 'sin_autorizacion' ? (
                  <div className="privacy-banner">
                    <ShieldAlert size={18} />
                    <div>
                      <b>La persona no autorizó el tratamiento de datos.</b>
                      <p>
                        Solo se conserva la referencia del canal. No se muestra ni se guarda el
                        contenido.
                      </p>
                    </div>
                  </div>
                ) : current.tipo === 'solicitud' ? (
                  <RequestCard
                    alert={current}
                    onDecision={(value) => setDecision({ alert: current, value })}
                  />
                ) : (
                  <div className="context-strip">
                    <span>
                      <Clock3 size={14} />
                    </span>
                    <p>
                      La atención automática está pausada. Continúa la conversación con una
                      respuesta cercana.
                    </p>
                  </div>
                )}
              </div>
              {current.autorizado ? (
                <div className="conversation-thread">
                  {(current.mensajes || []).map((message, index) => (
                    <MessageBubble key={`${message.fecha}-${index}`} message={message} />
                  ))}
                </div>
              ) : (
                <div className="protected-empty">
                  <ShieldCheck size={23} />
                  <b>Contenido protegido</b>
                  <span>
                    La vista conserva únicamente la referencia necesaria para identificar este
                    contacto.
                  </span>
                </div>
              )}
              {current.autorizado && current.tipo === 'persona' && (
                <>
                  <div className="window-note">
                    <Clock3 size={13} />
                    Telegram no aplica una ventana de 24 horas para responder.
                  </div>
                  {sendUrlConfigured ? (
                    <form className="reply-composer" onSubmit={sendMessage}>
                      <input
                        maxLength={1000}
                        value={text}
                        onChange={(event) => setText(event.target.value)}
                        placeholder="Escribe una respuesta cercana…"
                        aria-label="Respuesta"
                      />
                      <span className="composer-divider" />
                      <Button
                        variant="primary"
                        icon={Send}
                        loading={messageAction.isPending}
                        disabled={!text.trim()}
                      >
                        Enviar
                      </Button>
                    </form>
                  ) : (
                    <div className="alternate-contact">
                      <div>
                        <b>Respuesta desde el panel deshabilitada</b>
                        <small>El equipo debe configurar el endpoint de envío de n8n.</small>
                      </div>
                    </div>
                  )}
                  <button
                    className="button button-soft button-small"
                    onClick={() => setResolve(current)}
                  >
                    Finalizar atención
                  </button>
                </>
              )}
            </>
          ) : (
            <div className="conversation-welcome">
              <div className="welcome-inbox-symbol">
                <MessageCircle size={26} />
                <span>✳</span>
              </div>
              <div className="section-eyebrow">LA CONVERSACIÓN EMPIEZA CONTIGO</div>
              <h2>{items.length ? 'Elige a quién responder.' : 'Tu bandeja está en calma.'}</h2>
              <p>
                {items.length
                  ? 'Selecciona una alerta para conocer su contexto y decidir qué sigue.'
                  : 'No hay conversaciones o solicitudes pendientes.'}
              </p>
              <div className="welcome-inbox-foot">
                <span />
                <small>Privacidad cuidada, una conversación a la vez.</small>
              </div>
            </div>
          )}
        </article>
      </section>
      <Modal
        open={Boolean(resolve)}
        size="small"
        title={resolve?.tipo === 'persona' ? 'Finalizar atención' : 'Marcar como atendida'}
        description="La alerta saldrá de tu bandeja de pendientes."
        onClose={() => setResolve(null)}
        footer={
          <>
            <Button onClick={() => setResolve(null)}>Volver</Button>
            <Button
              variant="primary"
              icon={Check}
              loading={resolveAction.isPending}
              onClick={markAttended}
            >
              Confirmar
            </Button>
          </>
        }
      >
        <div className="resolve-copy">
          <span>
            <Check size={19} />
          </span>
          <p>
            ¿Terminaste de atender a{' '}
            <b>
              {formatCustomerReference({
                channel: resolve?.canal,
                reference: resolve?.cliente_ref,
                authorized: resolve?.autorizado,
              })}
            </b>
            ? La conversación seguirá disponible según el historial del sistema.
          </p>
        </div>
      </Modal>
      <Modal
        open={Boolean(decision)}
        size="small"
        title={`${decision?.value === 'aceptada' ? 'Aceptar' : 'Rechazar'} solicitud`}
        description="La decisión quedará registrada con fecha y persona responsable."
        onClose={() => setDecision(null)}
        footer={
          <>
            <Button onClick={() => setDecision(null)}>Volver</Button>
            <Button
              variant={decision?.value === 'rechazada' ? 'danger' : 'primary'}
              icon={Check}
              loading={requestAction.isPending}
              onClick={decideRequest}
            >
              Confirmar decisión
            </Button>
          </>
        }
      >
        <div className="decision-preview">
          <span className="section-eyebrow">PEDIDO {decision?.alert?.order_id}</span>
          <p>{decision?.alert?.solicitud?.detalle}</p>
          <small>El envío del aviso depende del flujo de notificaciones de n8n.</small>
        </div>
      </Modal>
    </div>
  );
}

function AlertCard({ alert, active, onClick }) {
  const Icon = icons[alert.tipo] || CircleHelp;
  return (
    <button className={`alert-card ${active ? 'active' : ''}`} onClick={onClick}>
      <span className={`alert-kind-icon kind-${alert.tipo}`}>
        <Icon size={16} />
      </span>
      <span className="alert-card-copy">
        <b>
          {formatCustomerReference({
            channel: alert.canal,
            reference: alert.cliente_ref,
            authorized: alert.autorizado,
          })}
        </b>
        <small>
          {labels[alert.tipo]}
          {alert.order_id ? ` · ${alert.order_id}` : ''}
        </small>
        <small className="alert-time">{formatRelative(alert.creado_en)}</small>
      </span>
      <ChevronRight size={15} className="alert-chevron" />
    </button>
  );
}

function MessageBubble({ message }) {
  const owner = message.autor === 'dueño';
  return (
    <div className={`message-row ${owner ? 'message-owner' : 'message-other'}`}>
      <div className={`message-avatar ${owner ? 'avatar-owner' : ''}`}>
        {message.autor === 'bot' ? 'C' : owner ? 'T' : 'C'}
      </div>
      <div className="message-body">
        <span className="message-author">
          {message.autor === 'bot' ? 'Asistente ComercIA' : owner ? 'Tú' : 'Cliente'}
        </span>
        <div
          className={`message-bubble ${owner ? 'bubble-owner' : message.autor === 'bot' ? 'bubble-bot' : 'bubble-customer'}`}
        >
          {message.contenido}
        </div>
        <small>{formatDateTime(message.fecha)}</small>
      </div>
    </div>
  );
}

function RequestCard({ alert, onDecision }) {
  const request = alert.solicitud;
  if (!request)
    return (
      <div className="privacy-banner">
        <CircleHelp size={18} />
        <div>
          <b>Solicitud no disponible</b>
          <p>Actualiza la bandeja para volver a consultar los datos.</p>
        </div>
      </div>
    );
  return (
    <div className="request-card">
      <div className="request-top">
        <span className="request-type">
          {request.tipo === 'cancelacion'
            ? 'SOLICITUD DE CANCELACIÓN'
            : 'SOLICITUD DE MODIFICACIÓN'}
        </span>
        <StatusBadge status="Pendiente" />
      </div>
      <b>Pedido {alert.order_id}</b>
      <p>{request.detalle}</p>
      <div className="request-actions">
        <Button variant="primary" icon={Check} onClick={() => onDecision('aceptada')}>
          Aceptar solicitud
        </Button>
        <Button variant="soft" icon={X} onClick={() => onDecision('rechazada')}>
          Rechazar
        </Button>
      </div>
      <small className="request-decision-note">
        El flujo de notificaciones de n8n se encarga de avisar al cliente.
      </small>
    </div>
  );
}
