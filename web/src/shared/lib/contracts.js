export const ORDER_STATUS = Object.freeze(['Pendiente', 'Procesado', 'Confirmado', 'Cancelado']);
export const ORDER_TRANSITIONS = Object.freeze({
  Pendiente: ['Procesado', 'Confirmado', 'Cancelado'],
  Procesado: ['Confirmado', 'Cancelado'],
  Confirmado: ['Cancelado'],
  Cancelado: [],
});
export const ORDER_HELP = Object.freeze({
  Pendiente: 'Entró y aún no lo has revisado.',
  Procesado: 'Lo estás preparando o gestionando.',
  Confirmado: 'Aceptado. En transferencia, el pago debe estar verificado.',
  Cancelado: 'No se llevará a cabo. Este estado es final.',
});
export const AVAILABILITY = Object.freeze(['disponible', 'agotado']);
export const DELIVERY_TYPES = Object.freeze(['domicilio', 'recogida']);
export const PAYMENT_TYPES = Object.freeze(['efectivo', 'transferencia']);
export const ALERT_TYPES = Object.freeze(['persona', 'sin_autorizacion', 'solicitud']);
export const REQUEST_STATES = Object.freeze(['pendiente', 'aceptada', 'rechazada']);
export const MESSAGE_AUTHORS = Object.freeze(['cliente', 'bot', 'dueño']);
export const PAGE_SIZE = 10;
export const ORDER_POLL_MS = 60_000;
export const DEFAULT_CHANNEL = 'telegram';

const channels = Object.freeze({
  telegram: Object.freeze({
    key: 'telegram',
    label: 'Telegram',
    responseWindow: false,
    customerHasPhone: false,
    canCopyContact: false,
    referenceLabel: 'Referencia de Telegram',
  }),
  whatsapp: Object.freeze({
    key: 'whatsapp',
    label: 'WhatsApp',
    responseWindow: false,
    customerHasPhone: true,
    canCopyContact: true,
    referenceLabel: 'Número',
  }),
});

export function allowedTransitions(status) {
  return ORDER_TRANSITIONS[status] || [];
}

export function canTransition(from, to) {
  return allowedTransitions(from).includes(to);
}

export function getChannel(key) {
  return channels[key] || channels[DEFAULT_CHANNEL];
}

export function formatCustomerReference({
  channel,
  reference,
  authorized = true,
  anonymized = false,
} = {}) {
  if (anonymized) return 'Cliente anonimizado';
  const contact = String(reference || '').trim();
  if (!authorized) return contact || 'Referencia no disponible';
  const label = getChannel(channel).referenceLabel;
  return contact ? `${label}: ${contact}` : 'Referencia no disponible';
}
