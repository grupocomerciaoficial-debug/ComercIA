const cop = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});
const bogotaDate = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'America/Bogota',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});
const bogotaDateTime = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'America/Bogota',
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});
export const formatCOP = (value) => cop.format(Number(value) || 0);
export const formatDate = (value) => (value ? bogotaDate.format(new Date(value)) : 'Sin fecha');
export const formatDateTime = (value) =>
  value ? bogotaDateTime.format(new Date(value)) : 'Sin fecha';
export const formatRelative = (value) => {
  if (!value) return 'Sin actividad';
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 1) return 'Ahora';
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  return `Hace ${Math.floor(hours / 24)} d`;
};
export const normalizeCategory = (value) =>
  String(value || '')
    .trim()
    .replace(/\s+/g, ' ');
