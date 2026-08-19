import OpeningHours from 'opening_hours';
import type { HoursInterval, WeeklyHours } from '@/lib/types';

/**
 * Expands an OSM `opening_hours` rule into concrete intervals for the seven days
 * starting at `weekStart`, indexed by weekday. Running the full evaluator here
 * rather than in the browser is what keeps the page inside its JS budget, and
 * because the ETL runs nightly the expansion is never more than one day stale —
 * so public-holiday rules land on the right day.
 *
 * Returns `null` for a rule the parser rejects: an unparseable string must
 * surface as "hours unknown", never as a guess (§F4).
 */
export function expandOsmHours(
  value: string,
  lat: number,
  lng: number,
  weekStart: Date,
): WeeklyHours | null {
  let oh: OpeningHours;
  try {
    oh = new OpeningHours(value, {
      address: { country_code: 'nl', state: 'Noord-Holland' },
      lat,
      lon: lng,
    });
  } catch {
    return null;
  }

  const week: HoursInterval[][] = [[], [], [], [], [], [], []];
  // Query a day either side of the week: the day before so a block that opened
  // on it and runs past midnight is seen whole and attributed to that day
  // instead of leaving a stray 00:00 fragment, and the day after so the last
  // day's own overnight block is complete.
  const windowStart = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() - 1);
  const windowEnd = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 8);

  let intervals: [Date, Date, boolean, string | undefined][];
  try {
    intervals = oh.getOpenIntervals(windowStart, windowEnd);
  } catch {
    return null;
  }

  for (const [from, to] of intervals) {
    // Each block belongs to the day it opens on; an overnight block therefore
    // stays a single interval rather than being cut in half at midnight, which
    // is exactly what the evaluator expects.
    const offset = Math.floor((from.getTime() - weekStart.getTime()) / 86_400_000);
    if (offset < 0 || offset > 6) continue;

    const spansFullDay = to.getTime() - from.getTime() >= 86_400_000;
    week[from.getDay()].push({
      from: hhmm(from),
      to: spansFullDay ? hhmm(from) : hhmm(to),
    });
  }

  return week.some((day) => day.length > 0) ? (week as WeeklyHours) : null;
}

/** Wall-clock time of day; a closing time before its opening time means tomorrow. */
function hhmm(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** Amsterdam wall-clock midnight for the day a run starts. */
export function weekStartFor(now: Date): Date {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Amsterdam',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const field = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return new Date(field('year'), field('month') - 1, field('day'));
}
