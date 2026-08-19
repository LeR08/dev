import type { HoursInterval, HoursSource, Venue, WeeklyHours } from '@/lib/types';

export const TIMEZONE = 'Europe/Amsterdam';

export type OpenState =
  | { kind: 'open'; until: string; closingSoon: boolean; minutesLeft: number }
  | { kind: 'closed'; opensAt: string | null; opensDay: number | null }
  | { kind: 'unknown' };

export type HoursResolution = {
  source: HoursSource | null;
  /** Licence hours are an outer bound, never a trading time — §11 tier 3. */
  qualified: boolean;
  weekly: WeeklyHours | null;
  osm: string | null;
  updatedAt: string | null;
};

/**
 * Amsterdam wall-clock fields for an instant, so the badge never depends on the
 * device timezone (§11). Returns a `Date` whose *local* fields carry Amsterdam's
 * wall clock — the shape `opening_hours.js` and our own evaluator both expect.
 */
export function amsterdamWallClock(now: Date = new Date()): Date {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const field = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return new Date(
    field('year'),
    field('month') - 1,
    field('day'),
    field('hour'),
    field('minute'),
    field('second'),
  );
}

const toMinutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
const fromMinutes = (m: number) => {
  const wrapped = ((m % 1440) + 1440) % 1440;
  return `${String(Math.floor(wrapped / 60)).padStart(2, '0')}:${String(wrapped % 60).padStart(2, '0')}`;
};

const CLOSING_SOON_MINUTES = 60;

/**
 * Picks the highest-trust tier that actually carries data (§11): a verified
 * community correction beats OSM, which beats the licence bound.
 *
 * Every tier is read from `hours_weekly` — concrete intervals the nightly ETL
 * expanded from whichever source won, public holidays included. Keeping the
 * OSM-syntax evaluator out of the browser is what holds the page inside its JS
 * budget; the cost is that a rule can be at most one run out of date.
 */
export interface HoursFields {
  hours_weekly: WeeklyHours | null;
  hours_source: HoursSource | null;
  hours_updated_at?: string | null;
  /** Present on the full record; the client index carries only `hours_weekly`. */
  hours_actual?: string | null;
  hours_licensed?: WeeklyHours | null;
}

export function resolveHours(venue: HoursFields): HoursResolution {
  if (venue.hours_source === 'community' || venue.hours_source === 'osm') {
    return {
      source: venue.hours_source,
      qualified: false,
      weekly: venue.hours_weekly,
      osm: venue.hours_actual ?? null,
      updatedAt: venue.hours_updated_at ?? null,
    };
  }
  if (venue.hours_weekly ?? venue.hours_licensed) {
    return {
      source: 'licence',
      qualified: true,
      weekly: venue.hours_weekly ?? venue.hours_licensed ?? null,
      osm: null,
      updatedAt: venue.hours_updated_at ?? null,
    };
  }
  return { source: null, qualified: false, weekly: null, osm: null, updatedAt: null };
}

type EvaluableVenue = HoursFields & Pick<Venue, 'status'>;

export function openState(venue: EvaluableVenue, now: Date = new Date()): OpenState {
  return openStateAtLocal(venue, amsterdamWallClock(now));
}

/**
 * Evaluates against an Amsterdam wall-clock instant directly, which is what the
 * "open after 23:00" filter needs — it asks about a specific local time rather
 * than about now.
 */
export function openStateAtLocal(venue: EvaluableVenue, local: Date): OpenState {
  if (venue.status !== 'open') return { kind: 'closed', opensAt: null, opensDay: null };
  const resolved = resolveHours(venue);
  if (resolved.weekly) return evaluateWeekly(resolved.weekly, local);
  return { kind: 'unknown' };
}

/** Amsterdam wall clock for today at `hour:minute`. */
export function amsterdamToday(hour: number, minute = 0, now: Date = new Date()): Date {
  const local = amsterdamWallClock(now);
  return new Date(local.getFullYear(), local.getMonth(), local.getDate(), hour, minute);
}

/**
 * A closing time earlier than its opening time means the next day: 07:00-01:00
 * is an eighteen-hour block, so 00:30 on Tuesday is covered by Monday's block.
 */
export function evaluateWeekly(week: WeeklyHours, local: Date): OpenState {
  const day = local.getDay();
  const minutes = local.getHours() * 60 + local.getMinutes();

  for (const offset of [0, -1]) {
    const sourceDay = (day + offset + 7) % 7;
    // Relative to midnight of the day the block *starts* on.
    const cursor = minutes + (offset === -1 ? 1440 : 0);
    for (const interval of week[sourceDay]) {
      const start = toMinutes(interval.from);
      const end = toMinutes(interval.to) <= start ? toMinutes(interval.to) + 1440 : toMinutes(interval.to);
      if (cursor >= start && cursor < end) {
        const minutesLeft = end - cursor;
        return {
          kind: 'open',
          until: interval.to,
          closingSoon: minutesLeft <= CLOSING_SOON_MINUTES,
          minutesLeft,
        };
      }
    }
  }

  const next = nextOpening(week, day, minutes);
  return { kind: 'closed', opensAt: next?.at ?? null, opensDay: next?.day ?? null };
}

function nextOpening(week: WeeklyHours, day: number, minutes: number) {
  for (let ahead = 0; ahead < 8; ahead += 1) {
    const candidateDay = (day + ahead) % 7;
    const starts = week[candidateDay]
      .map((interval: HoursInterval) => toMinutes(interval.from))
      .sort((a, b) => a - b);
    for (const start of starts) {
      if (ahead > 0 || start > minutes) return { at: fromMinutes(start), day: candidateDay };
    }
  }
  return null;
}

/** Weekly table for the detail page, straight from the expanded intervals. */
export function weeklyTable(venue: HoursFields): { day: number; intervals: HoursInterval[] }[] | null {
  const resolved = resolveHours(venue);
  if (!resolved.weekly) return null;
  return resolved.weekly.map((intervals, day) => ({ day, intervals }));
}

export type BadgeTone = 'open' | 'soon' | 'closed' | 'unknown';

/**
 * The badge as data rather than as a sentence, so each locale renders it in its
 * own words. `unknown` is a legitimate state and never collapses into
 * `closed` — §F4 forbids guessing.
 */
export type BadgeDescriptor =
  | { key: 'openUntil'; time: string; tone: 'open' }
  | { key: 'closingSoon'; time: string; tone: 'soon' }
  | { key: 'opensAt'; time: string; tone: 'closed' }
  | { key: 'closed'; tone: 'closed' }
  | { key: 'unknown'; tone: 'unknown' };

export function badgeDescriptor(state: OpenState): BadgeDescriptor {
  switch (state.kind) {
    case 'open':
      return state.closingSoon
        ? { key: 'closingSoon', time: state.until, tone: 'soon' }
        : { key: 'openUntil', time: state.until, tone: 'open' };
    case 'closed':
      return state.opensAt
        ? { key: 'opensAt', time: state.opensAt, tone: 'closed' }
        : { key: 'closed', tone: 'closed' };
    default:
      return { key: 'unknown', tone: 'unknown' };
  }
}
