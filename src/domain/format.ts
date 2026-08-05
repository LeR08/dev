/**
 * Display formatting. Kept separate from the maths so numbers stay exact until
 * the moment they are shown.
 */

import { mlToCl } from './alcohol';
import { dayKey, sameDay, startOfDay } from './dates';
import type { IntakeUnit, VolumeUnit } from './types';

export const CURRENCIES = [
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'GBP', symbol: '£', label: 'British pound' },
  { code: 'USD', symbol: '$', label: 'US dollar' },
  { code: 'CHF', symbol: 'CHF', label: 'Swiss franc' },
  { code: 'CAD', symbol: '$', label: 'Canadian dollar' },
  { code: 'AUD', symbol: '$', label: 'Australian dollar' },
  { code: 'SEK', symbol: 'kr', label: 'Swedish krona' },
  { code: 'NOK', symbol: 'kr', label: 'Norwegian krone' },
  { code: 'DKK', symbol: 'kr', label: 'Danish krone' },
  { code: 'PLN', symbol: 'zł', label: 'Polish złoty' },
  { code: 'JPY', symbol: '¥', label: 'Japanese yen' },
] as const;

export function currencySymbol(code: string): string {
  return CURRENCIES.find((currency) => currency.code === code)?.symbol ?? code;
}

/** Trim trailing zeros so "2.0" reads as "2" but "2.5" keeps its half. */
export function trimNumber(value: number, maxDecimals = 1): string {
  if (!isFinite(value)) return '0';
  const rounded = Number(value.toFixed(maxDecimals));
  return `${rounded}`;
}

export function formatMoney(value: number, currency: string, options?: { compact?: boolean }): string {
  const symbol = currencySymbol(currency);
  const decimals = options?.compact && Math.abs(value) >= 100 ? 0 : 2;
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: decimals,
      minimumFractionDigits: decimals,
    }).format(value);
  } catch {
    return `${symbol}${value.toFixed(decimals)}`;
  }
}

export function formatVolume(ml: number, unit: VolumeUnit): string {
  if (unit === 'cl') {
    return `${trimNumber(mlToCl(ml), 1)} cl`;
  }
  return `${Math.round(ml)} ml`;
}

/** Volume in the user's unit, as a bare number (for text inputs). */
export function volumeInUnit(ml: number, unit: VolumeUnit): number {
  return unit === 'cl' ? Number(mlToCl(ml).toFixed(2)) : Math.round(ml);
}

export function intakeUnitLabel(unit: IntakeUnit, value = 2): string {
  if (unit === 'grams') return 'g';
  return Math.abs(value) === 1 ? 'drink' : 'drinks';
}

export function formatIntake(value: number, unit: IntakeUnit): string {
  if (unit === 'grams') {
    // A real but tiny amount should not be reported as a flat zero.
    if (value > 0 && value < 0.5) return '<1 g';
    return `${trimNumber(value, 0)} g`;
  }
  if (value > 0 && value < 0.05) return '<0.1 drinks';
  return `${trimNumber(value, 1)} ${intakeUnitLabel(unit, value)}`;
}

export function formatAbv(abv: number): string {
  return `${trimNumber(abv, 1)}%`;
}

function safeFormatDate(date: Date | number, options: Intl.DateTimeFormatOptions): string {
  try {
    return new Intl.DateTimeFormat(undefined, options).format(new Date(date));
  } catch {
    return new Date(date).toDateString();
  }
}

export function formatTime(date: Date | number): string {
  return safeFormatDate(date, { hour: '2-digit', minute: '2-digit' });
}

export function formatDate(date: Date | number): string {
  return safeFormatDate(date, { weekday: 'short', day: 'numeric', month: 'short' });
}

export function formatLongDate(date: Date | number): string {
  return safeFormatDate(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export function formatMonth(date: Date | number): string {
  return safeFormatDate(date, { month: 'long', year: 'numeric' });
}

export function formatWeekdayShort(date: Date | number): string {
  return safeFormatDate(date, { weekday: 'narrow' });
}

/** "Today", "Yesterday", or a short date — for history section headers. */
export function formatRelativeDay(date: Date | number, now: Date | number = Date.now()): string {
  if (sameDay(date, now)) return 'Today';
  const yesterday = startOfDay(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (dayKey(date) === dayKey(yesterday)) return 'Yesterday';
  return formatDate(date);
}

export function formatDateTime(date: Date | number, now: Date | number = Date.now()): string {
  return `${formatRelativeDay(date, now)} · ${formatTime(date)}`;
}

/** Signed percentage, e.g. "+12%" / "−8%". Null change renders as an em dash. */
export function formatChange(change: number | null): string {
  if (change === null) return '—';
  const pct = Math.round(change * 100);
  if (pct === 0) return 'about the same';
  const sign = pct > 0 ? '+' : '−';
  return `${sign}${Math.abs(pct)}%`;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return Math.abs(count) === 1 ? singular : plural;
}

/**
 * Caption under a stat card comparing two windows.
 *
 * A percentage against a previous window of zero would be meaningless (and
 * "+∞%" reads like an accusation), so those cases get plain wording instead.
 */
export function formatComparison(
  comparison: { current: number; previous: number; change: number | null },
  periodName: string
): string {
  if (comparison.previous === 0) {
    return comparison.current === 0
      ? `Nothing in the ${periodName} either`
      : `Nothing logged in the ${periodName}`;
  }
  return `${formatChange(comparison.change)} vs ${periodName}`;
}
