import type { HoursInterval, WeeklyHours } from '@/lib/types';

/**
 * The Amsterdam licence dataset writes times as `HH.MM`, but a meaningful share
 * of rows carry junk instead: `_kies`, `-`, `1 uur voor eerste activiteit`,
 * empty strings. §5.1 requires anything that is not a well-formed `HH.MM` to
 * become `null` rather than being coerced into a plausible-looking time.
 */
export function parseLicenceTime(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  const match = /^(\d{1,2})[.:](\d{2})$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  // 24.00 appears in the data as "midnight at the end of the day".
  if (hours === 24 && minutes === 0) return '00:00';
  if (hours > 23 || minutes > 59) return null;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * The licence encodes exactly two blocks — Sunday-to-Thursday and
 * Friday-to-Saturday — which §11 asks us to expand across all seven days.
 * Index 0 is Sunday, matching `Date#getDay`.
 */
export function expandLicenceHours(input: {
  sunThuFrom: unknown;
  sunThuTo: unknown;
  friSatFrom: unknown;
  friSatTo: unknown;
}): WeeklyHours | null {
  const sunThu = intervalOf(input.sunThuFrom, input.sunThuTo);
  const friSat = intervalOf(input.friSatFrom, input.friSatTo);
  if (!sunThu && !friSat) return null;

  const week: HoursInterval[][] = [[], [], [], [], [], [], []];
  for (const day of [0, 1, 2, 3, 4]) if (sunThu) week[day] = [sunThu];
  for (const day of [5, 6]) if (friSat) week[day] = [friSat];
  return week as WeeklyHours;
}

function intervalOf(from: unknown, to: unknown): HoursInterval | null {
  const parsedFrom = parseLicenceTime(from);
  const parsedTo = parseLicenceTime(to);
  if (!parsedFrom || !parsedTo) return null;
  // A venue licensed "07.00 - 07.00" carries no usable information.
  if (parsedFrom === parsedTo) return null;
  return { from: parsedFrom, to: parsedTo };
}
