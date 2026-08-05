import { entryGrams } from '@/domain/alcohol';
import type { Backup } from '@/db/store';
import type { Drink, Entry, Profile, Settings, Ticket } from '@/domain/types';

export const BACKUP_FORMAT_VERSION = 1;

export function buildBackup(
  entries: Entry[],
  drinks: Drink[],
  settings: Settings,
  profile: Profile | null,
  tickets: Ticket[],
  now = Date.now()
): Backup {
  return {
    app: 'tally',
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: now,
    settings,
    // Catalog drinks ship with the app, so only the user's own presets are
    // worth carrying in a backup.
    customDrinks: drinks.filter((drink) => drink.isCustom),
    entries,
    profile,
    tickets,
  };
}

export function toJson(backup: Backup): string {
  return JSON.stringify(backup, null, 2);
}

const CSV_COLUMNS = [
  'id',
  'consumed_at_iso',
  'date',
  'time',
  'name',
  'category',
  'abv_percent',
  'volume_ml',
  'quantity',
  'total_volume_ml',
  'pure_alcohol_grams',
  'price',
  'currency',
  'location',
  'note',
] as const;

/**
 * CSV export.
 *
 * Includes the derived columns (total volume, grams of pure alcohol) so the
 * file is directly useful in a spreadsheet without re-deriving the maths.
 */
export function toCsv(entries: Entry[], currency: string): string {
  const rows = entries
    .slice()
    .sort((a, b) => a.consumedAt - b.consumedAt)
    .map((entry) => {
      const date = new Date(entry.consumedAt);
      return [
        entry.id,
        date.toISOString(),
        formatLocalDate(date),
        formatLocalTime(date),
        entry.name,
        entry.category,
        round(entry.abv, 2),
        round(entry.volumeMl, 2),
        round(entry.quantity, 2),
        round(entry.volumeMl * entry.quantity, 2),
        round(entryGrams(entry), 2),
        entry.price === null ? '' : round(entry.price, 2),
        entry.price === null ? '' : currency,
        entry.location ?? '',
        entry.note ?? '',
      ].map(csvCell);
    });

  return [CSV_COLUMNS.join(','), ...rows.map((row) => row.join(','))].join('\n');
}

function csvCell(value: string | number): string {
  const text = `${value}`;
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function round(value: number, decimals: number): number {
  return Number(value.toFixed(decimals));
}

function formatLocalDate(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function formatLocalTime(date: Date): string {
  return `${`${date.getHours()}`.padStart(2, '0')}:${`${date.getMinutes()}`.padStart(2, '0')}`;
}

export function backupFileName(kind: 'json' | 'csv', now = Date.now()): string {
  return `tally-export-${formatLocalDate(new Date(now))}.${kind}`;
}

const TICKET_CSV_COLUMNS = [
  'id',
  'type',
  'status',
  'title',
  'description',
  'app_version',
  'platform',
  'created_at_iso',
] as const;

/**
 * CSV export for tickets (spec v1.2 §9.1) — a stand-in for real submission
 * while the app has no backend: this is how they get off the device.
 */
export function ticketsToCsv(tickets: Ticket[]): string {
  const rows = tickets
    .slice()
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((ticket) =>
      [
        ticket.id,
        ticket.type,
        ticket.status,
        ticket.title,
        ticket.description,
        ticket.appVersion,
        ticket.platform,
        new Date(ticket.createdAt).toISOString(),
      ].map(csvCell)
    );

  return [TICKET_CSV_COLUMNS.join(','), ...rows.map((row) => row.join(','))].join('\n');
}

export function ticketsFileName(kind: 'json' | 'csv', now = Date.now()): string {
  return `tally-tickets-${formatLocalDate(new Date(now))}.${kind}`;
}
