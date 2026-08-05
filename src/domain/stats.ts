/**
 * Aggregations over logged entries.
 *
 * All of it is pure: rows in, numbers out. The storage layer narrows entries to
 * a date range with an indexed query; the shaping for charts and summary cards
 * happens here so it can be unit-tested without a database.
 */

import { entryGrams } from './alcohol';
import {
  addDays,
  dayKey,
  daysBetween,
  eachDay,
  eachPeriod,
  nextPeriod,
  startOfDay,
  startOfPeriod,
  type Granularity,
  type Range,
  type WeekStart,
} from './dates';
import { CATEGORIES, type Category, type Entry } from './types';

export type Totals = {
  /** Grams of pure alcohol. */
  grams: number;
  /** Money spent, in the user's currency. Entries without a price contribute 0. */
  spend: number;
  /** Number of servings (sum of quantities). */
  servings: number;
  /** Number of log entries. */
  entries: number;
  /** Distinct local days that have at least one entry. */
  drinkingDays: number;
};

export type Bucket = Totals & {
  /** Local day key of the bucket start — stable identity for lists and charts. */
  key: string;
  start: number;
  /** Exclusive. */
  end: number;
};

export type CategoryTotal = {
  category: Category;
  grams: number;
  spend: number;
  servings: number;
  share: number;
};

export const EMPTY_TOTALS: Totals = {
  grams: 0,
  spend: 0,
  servings: 0,
  entries: 0,
  drinkingDays: 0,
};

export function filterByRange(entries: Entry[], range: Range): Entry[] {
  return entries.filter((e) => e.consumedAt >= range.start && e.consumedAt < range.end);
}

export function totals(entries: Entry[]): Totals {
  const days = new Set<string>();
  let grams = 0;
  let spend = 0;
  let servings = 0;

  for (const entry of entries) {
    grams += entryGrams(entry);
    spend += entry.price ?? 0;
    servings += entry.quantity;
    days.add(dayKey(entry.consumedAt));
  }

  return { grams, spend, servings, entries: entries.length, drinkingDays: days.size };
}

/**
 * Group entries into consecutive periods covering `range`.
 * Empty periods are included so charts keep an even time axis.
 */
export function bucketize(
  entries: Entry[],
  range: Range,
  granularity: Granularity,
  weekStartsOn: WeekStart = 1
): Bucket[] {
  const starts = eachPeriod(range.start, range.end, granularity, weekStartsOn);
  const buckets: Bucket[] = starts.map((start) => ({
    ...EMPTY_TOTALS,
    key: dayKey(start),
    start: start.getTime(),
    end: nextPeriod(start, granularity, weekStartsOn).getTime(),
  }));

  if (buckets.length === 0) return buckets;

  const byKey = new Map(buckets.map((bucket) => [bucket.key, bucket]));
  const daysSeen = new Map<string, Set<string>>();

  for (const entry of entries) {
    if (entry.consumedAt < range.start || entry.consumedAt >= range.end) continue;
    const key = dayKey(startOfPeriod(entry.consumedAt, granularity, weekStartsOn));
    const bucket = byKey.get(key);
    if (!bucket) continue;

    bucket.grams += entryGrams(entry);
    bucket.spend += entry.price ?? 0;
    bucket.servings += entry.quantity;
    bucket.entries += 1;

    let days = daysSeen.get(key);
    if (!days) {
      days = new Set();
      daysSeen.set(key, days);
    }
    days.add(dayKey(entry.consumedAt));
    bucket.drinkingDays = days.size;
  }

  return buckets;
}

export function categoryTotals(entries: Entry[]): CategoryTotal[] {
  const map = new Map<Category, CategoryTotal>();

  for (const entry of entries) {
    const current = map.get(entry.category) ?? {
      category: entry.category,
      grams: 0,
      spend: 0,
      servings: 0,
      share: 0,
    };
    current.grams += entryGrams(entry);
    current.spend += entry.price ?? 0;
    current.servings += entry.quantity;
    map.set(entry.category, current);
  }

  const total = [...map.values()].reduce((sum, item) => sum + item.grams, 0);
  return [...map.values()]
    .map((item) => ({ ...item, share: total > 0 ? item.grams / total : 0 }))
    .sort((a, b) => b.grams - a.grams || CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category));
}

/** Day keys that have at least one entry. */
export function drinkingDayKeys(entries: Entry[]): Set<string> {
  return new Set(entries.map((entry) => dayKey(entry.consumedAt)));
}

/**
 * Consecutive alcohol-free days ending today.
 *
 * Today counts while it is still empty — the streak is meant to encourage, and
 * it simply stops growing if something gets logged later in the day.
 *
 * The count never reaches back past the first entry: days before the user
 * started tracking were not observed, and claiming them would make the number
 * meaningless (a brand new log would otherwise show years of "success").
 */
export function currentAlcoholFreeStreak(entries: Entry[], now: Date | number = Date.now()): number {
  if (entries.length === 0) return 0;

  const keys = drinkingDayKeys(entries);
  const first = startOfDay(Math.min(...entries.map((entry) => entry.consumedAt))).getTime();

  let streak = 0;
  let cursor = startOfDay(now);
  while (cursor.getTime() >= first && !keys.has(dayKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/**
 * Longest run of alcohol-free days between the first entry and `now`.
 * Days before the very first entry are not counted — the user was not
 * tracking then, and inflating the record would make it meaningless.
 */
export function longestAlcoholFreeStreak(entries: Entry[], now: Date | number = Date.now()): number {
  if (entries.length === 0) return 0;
  const keys = drinkingDayKeys(entries);
  const first = startOfDay(Math.min(...entries.map((entry) => entry.consumedAt)));
  const today = startOfDay(now);
  if (today.getTime() < first.getTime()) return 0;

  let longest = 0;
  let run = 0;
  for (const day of eachDay(first, addDays(today, 1))) {
    if (keys.has(dayKey(day))) {
      run = 0;
    } else {
      run += 1;
      if (run > longest) longest = run;
    }
  }
  return longest;
}

export type DayFlag = {
  key: string;
  start: number;
  hasDrink: boolean;
  grams: number;
  /**
   * True only for days the log actually covers: on or after the first entry,
   * and not in the future. Days outside that window are placeholders — they
   * are not achievements, and counting them would let a brand new log claim a
   * year of alcohol-free days.
   */
  elapsed: boolean;
};

/** The day tracking began, or null when nothing has been logged. */
function trackingStart(entries: Entry[]): number | null {
  if (entries.length === 0) return null;
  return startOfDay(Math.min(...entries.map((entry) => entry.consumedAt))).getTime();
}

/**
 * Per-day flags across a range, for the calendar strip and free-day counts.
 *
 * Pass the whole log, not a pre-filtered slice: the first entry anywhere in the
 * log is what marks the start of tracking.
 */
export function dayFlags(entries: Entry[], range: Range, now: Date | number = Date.now()): DayFlag[] {
  const gramsByDay = new Map<string, number>();
  for (const entry of entries) {
    if (entry.consumedAt < range.start || entry.consumedAt >= range.end) continue;
    const key = dayKey(entry.consumedAt);
    gramsByDay.set(key, (gramsByDay.get(key) ?? 0) + entryGrams(entry));
  }

  const today = startOfDay(now).getTime();
  const since = trackingStart(entries);

  return eachDay(range.start, range.end).map((day) => {
    const key = dayKey(day);
    const grams = gramsByDay.get(key) ?? 0;
    const time = day.getTime();
    return {
      key,
      start: time,
      hasDrink: grams > 0,
      grams,
      elapsed: since !== null && time >= since && time <= today,
    };
  });
}

/** Alcohol-free days so far in a range (days still in the future don't count). */
export function alcoholFreeDays(entries: Entry[], range: Range, now: Date | number = Date.now()): number {
  return dayFlags(entries, range, now).filter((day) => day.elapsed && !day.hasDrink).length;
}

export type Comparison = {
  current: number;
  previous: number;
  /** Signed change as a fraction of the previous value; null when previous is 0. */
  change: number | null;
};

export function compare(current: number, previous: number): Comparison {
  if (previous === 0) {
    return { current, previous, change: null };
  }
  return { current, previous, change: (current - previous) / previous };
}

/** Mean grams per elapsed day in a range — a fairer "average" for the current week. */
export function averagePerDay(entries: Entry[], range: Range, now: Date | number = Date.now()): number {
  const elapsed = dayFlags(entries, range, now).filter((day) => day.elapsed).length;
  if (elapsed === 0) return 0;
  return totals(filterByRange(entries, range)).grams / elapsed;
}

export type DrinkTally = {
  name: string;
  category: Category;
  servings: number;
  grams: number;
  spend: number;
};

/** Most-logged drinks by serving count, for "your usuals" style shortcuts. */
export function topDrinks(entries: Entry[], limit = 5): DrinkTally[] {
  const map = new Map<string, DrinkTally>();
  for (const entry of entries) {
    const key = `${entry.category}:${entry.name.toLowerCase()}`;
    const current = map.get(key) ?? {
      name: entry.name,
      category: entry.category,
      servings: 0,
      grams: 0,
      spend: 0,
    };
    current.servings += entry.quantity;
    current.grams += entryGrams(entry);
    current.spend += entry.price ?? 0;
    map.set(key, current);
  }
  return [...map.values()].sort((a, b) => b.servings - a.servings).slice(0, limit);
}

/** Days since the most recent entry, or null when nothing has been logged. */
export function daysSinceLastDrink(entries: Entry[], now: Date | number = Date.now()): number | null {
  if (entries.length === 0) return null;
  const last = Math.max(...entries.map((entry) => entry.consumedAt));
  return Math.max(0, daysBetween(last, now));
}
