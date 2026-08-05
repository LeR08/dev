import { SEED_ALIASES } from '@/db/seed';
import type { Range } from './dates';
import type { Category, Drink, Entry } from './types';

export type DrinkFilter = Category | 'all' | 'mine';

/** Lowercase and strip accents so "rosé" matches "rose" and vice versa. */
export function normalizeSearch(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Ranked search over drink names and hidden aliases.
 *
 * Aliases let "demi", "pinte" or "cidre" find the right preset without those
 * words appearing in the list. Prefix matches rank above substring matches,
 * which rank above alias matches.
 */
export function searchDrinks(drinks: Drink[], query: string, filter: DrinkFilter = 'all'): Drink[] {
  const normalized = normalizeSearch(query.trim());

  const filtered = drinks.filter((drink) => {
    if (filter === 'mine') return drink.isCustom;
    if (filter !== 'all' && drink.category !== filter) return false;
    return true;
  });

  if (normalized.length === 0) return filtered;

  const scored: { drink: Drink; score: number }[] = [];
  for (const drink of filtered) {
    const name = normalizeSearch(drink.name);
    let score = -1;
    if (name.startsWith(normalized)) score = 0;
    else if (name.includes(normalized)) score = 1;
    else {
      const aliases = SEED_ALIASES.get(drink.id) ?? [];
      if (aliases.some((alias) => normalizeSearch(alias).includes(normalized))) score = 2;
    }
    if (score >= 0) scored.push({ drink, score });
  }

  return scored
    .sort((a, b) => a.score - b.score || a.drink.name.localeCompare(b.drink.name))
    .map((item) => item.drink);
}

export type EntryFilter = {
  /** Null means "all time". */
  range: Range | null;
  category: Category | 'all';
  query: string;
};

/** History filtering: date range, category, and free text over name/note/place. */
export function filterEntries(entries: Entry[], options: EntryFilter): Entry[] {
  const needle = normalizeSearch(options.query.trim());

  return entries.filter((entry) => {
    if (options.range && (entry.consumedAt < options.range.start || entry.consumedAt >= options.range.end)) {
      return false;
    }
    if (options.category !== 'all' && entry.category !== options.category) return false;
    if (needle.length === 0) return true;

    const haystack = normalizeSearch([entry.name, entry.note ?? '', entry.location ?? ''].join(' '));
    return haystack.includes(needle);
  });
}
