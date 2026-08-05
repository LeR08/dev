/**
 * Local-time date helpers.
 *
 * Everything here works in the device's local timezone: a drink logged at
 * 23:30 belongs to that evening, not to the next UTC day. Day arithmetic goes
 * through `setDate`/`setMonth` rather than adding milliseconds so it stays
 * correct across daylight-saving transitions.
 */

export type Granularity = 'day' | 'week' | 'month';

export type Range = {
  /** Inclusive start, epoch ms. */
  start: number;
  /** Exclusive end, epoch ms. */
  end: number;
};

export type WeekStart = 0 | 1;

export function startOfDay(date: Date | number): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date | number): Date {
  const d = startOfDay(date);
  d.setDate(d.getDate() + 1);
  return d;
}

export function addDays(date: Date | number, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function addMonths(date: Date | number, months: number): Date {
  const d = new Date(date);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  // Clamp to the last day of the shorter target month (Jan 31 + 1 month = Feb 28).
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return d;
}

export function startOfWeek(date: Date | number, weekStartsOn: WeekStart = 1): Date {
  const d = startOfDay(date);
  const diff = (d.getDay() - weekStartsOn + 7) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}

export function startOfMonth(date: Date | number): Date {
  const d = startOfDay(date);
  d.setDate(1);
  return d;
}

export function startOfPeriod(
  date: Date | number,
  granularity: Granularity,
  weekStartsOn: WeekStart = 1
): Date {
  switch (granularity) {
    case 'day':
      return startOfDay(date);
    case 'week':
      return startOfWeek(date, weekStartsOn);
    case 'month':
      return startOfMonth(date);
  }
}

export function nextPeriod(
  date: Date | number,
  granularity: Granularity,
  weekStartsOn: WeekStart = 1
): Date {
  const start = startOfPeriod(date, granularity, weekStartsOn);
  switch (granularity) {
    case 'day':
      return addDays(start, 1);
    case 'week':
      return addDays(start, 7);
    case 'month':
      return addMonths(start, 1);
  }
}

/** Stable local `YYYY-MM-DD` key for a moment in time. */
export function dayKey(date: Date | number): string {
  const d = new Date(date);
  const month = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

export function sameDay(a: Date | number, b: Date | number): boolean {
  return dayKey(a) === dayKey(b);
}

/** Whole days between two instants, counted by calendar day, `b - a`. */
export function daysBetween(a: Date | number, b: Date | number): number {
  const startA = startOfDay(a).getTime();
  const startB = startOfDay(b).getTime();
  // Round rather than floor so a DST hour cannot shift the result.
  return Math.round((startB - startA) / 86_400_000);
}

/** Every day-start from `start` (inclusive) up to `end` (exclusive). */
export function eachDay(start: Date | number, end: Date | number): Date[] {
  const days: Date[] = [];
  let cursor = startOfDay(start);
  const limit = new Date(end).getTime();
  while (cursor.getTime() < limit) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return days;
}

/** Every period-start from `start` (inclusive) up to `end` (exclusive). */
export function eachPeriod(
  start: Date | number,
  end: Date | number,
  granularity: Granularity,
  weekStartsOn: WeekStart = 1
): Date[] {
  const periods: Date[] = [];
  let cursor = startOfPeriod(start, granularity, weekStartsOn);
  const limit = new Date(end).getTime();
  let guard = 0;
  while (cursor.getTime() < limit && guard++ < 5000) {
    periods.push(cursor);
    cursor = nextPeriod(cursor, granularity, weekStartsOn);
  }
  return periods;
}

/**
 * The range covering the last `count` periods, ending with the one containing
 * `now`. Used for "last 7 days", "last 12 weeks", etc.
 */
export function trailingRange(
  now: Date | number,
  granularity: Granularity,
  count: number,
  weekStartsOn: WeekStart = 1
): Range {
  const end = nextPeriod(now, granularity, weekStartsOn).getTime();
  let start = startOfPeriod(now, granularity, weekStartsOn);
  for (let i = 1; i < count; i++) {
    switch (granularity) {
      case 'day':
        start = addDays(start, -1);
        break;
      case 'week':
        start = addDays(start, -7);
        break;
      case 'month':
        start = addMonths(start, -1);
        break;
    }
  }
  return { start: start.getTime(), end };
}

/** The single period containing `date`, offset by `offset` periods. */
export function periodRange(
  date: Date | number,
  granularity: Granularity,
  weekStartsOn: WeekStart = 1,
  offset = 0
): Range {
  let start = startOfPeriod(date, granularity, weekStartsOn);
  if (offset !== 0) {
    switch (granularity) {
      case 'day':
        start = addDays(start, offset);
        break;
      case 'week':
        start = addDays(start, offset * 7);
        break;
      case 'month':
        start = addMonths(start, offset);
        break;
    }
    start = startOfPeriod(start, granularity, weekStartsOn);
  }
  return { start: start.getTime(), end: nextPeriod(start, granularity, weekStartsOn).getTime() };
}

/** The equivalent range one period earlier — for "this week vs last week". */
export function previousRange(range: Range, granularity: Granularity, weekStartsOn: WeekStart = 1): Range {
  return periodRange(range.start, granularity, weekStartsOn, -1);
}

export function isWithin(range: Range, at: number): boolean {
  return at >= range.start && at < range.end;
}
