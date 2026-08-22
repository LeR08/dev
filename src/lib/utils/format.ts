/**
 * Formatage — utilisé partout dans l'interface. Aucune logique dupliquée ailleurs.
 */

/** 3725 → "1 h 02". Pour les durées longues (formation, module). */
export function formatDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return '0 min';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.round((totalSeconds % 3600) / 60);
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} h`;
  return `${hours} h ${String(minutes).padStart(2, '0')}`;
}

/** 3725 → "1:02:05". Pour le lecteur vidéo. */
export function formatTimecode(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const mm = String(minutes).padStart(hours > 0 ? 2 : 1, '0');
  const ss = String(seconds).padStart(2, '0');
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** 78.4 → "78 %". Espace insécable avant le %, typographie française. */
export function formatPercent(value: number): string {
  return `${Math.round(value)} %`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('fr-FR').format(value);
}

export function formatDate(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(date);
}

export function formatDateTime(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

/** "il y a 3 jours" — sans dépendance, pour les flux d'activité. */
export function formatRelative(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat('fr-FR', { numeric: 'auto' });

  const thresholds: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['second', 60],
    ['minute', 60],
    ['hour', 24],
    ['day', 30],
    ['month', 12],
  ];

  let value2 = diffSeconds;
  for (const [unit, limit] of thresholds) {
    if (Math.abs(value2) < limit) return rtf.format(Math.round(value2), unit);
    value2 /= limit;
  }
  return rtf.format(Math.round(value2), 'year');
}

/** Initiales pour les avatars sans photo. */
export function getInitials(firstName?: string | null, lastName?: string | null): string {
  const a = firstName?.trim()?.[0] ?? '';
  const b = lastName?.trim()?.[0] ?? '';
  const initials = `${a}${b}`.toUpperCase();
  return initials || '?';
}

export function getFullName(firstName?: string | null, lastName?: string | null): string {
  return [firstName, lastName].filter(Boolean).join(' ').trim();
}

/** "Analyse des données" → "analyse-des-donnees" */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function pluralize(count: number, singular: string, plural?: string): string {
  return count > 1 ? (plural ?? `${singular}s`) : singular;
}
