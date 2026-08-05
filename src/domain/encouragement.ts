/**
 * Copy helpers.
 *
 * House rules for anything written here: never scold, never imply failure, and
 * never call a number "too much". The app reports what happened and celebrates
 * what the user chose to do — deciding what it means is their job, not ours.
 *
 * These return a translation key (plus interpolation params) rather than a
 * final string. Domain code stays UI/locale-agnostic — the actual English,
 * French, etc. text lives in src/i18n/locales — and the caller does
 * `t(result.key, result.params)`. `key` is a plain string here rather than
 * the i18n package's typed `TranslationKey` to avoid src/domain depending on
 * src/i18n; the two are kept in sync by src/i18n's own catalog-parity test
 * plus the key literals below matching src/i18n/locales/en.json exactly.
 */

export type Copy = { key: string; params?: Record<string, string | number> };

export const STREAK_MILESTONES = [1, 2, 3, 7, 10, 14, 21, 30, 50, 60, 90, 100, 150, 180, 270, 365];

export function nextMilestone(streak: number): number | null {
  return STREAK_MILESTONES.find((milestone) => milestone > streak) ?? null;
}

export function isMilestone(streak: number): boolean {
  return STREAK_MILESTONES.includes(streak);
}

/** Headline for the alcohol-free streak card. */
export function streakHeadline(streak: number): Copy {
  if (streak === 0) return { key: 'encouragement.trackingToday' };
  if (streak === 1) return { key: 'encouragement.streakOneDay' };
  return { key: 'encouragement.streakDays', params: { count: streak } };
}

export function streakSubtitle(streak: number): Copy {
  if (streak === 0) return { key: 'encouragement.subtitleZero' };
  if (streak === 1) return { key: 'encouragement.subtitleOne' };
  if (streak < 7) return { key: 'encouragement.subtitleForming' };

  const next = nextMilestone(streak);
  if (next === null) return { key: 'encouragement.subtitleRemarkable' };
  const remaining = next - streak;
  return { key: 'encouragement.subtitleToNext', params: { remaining, next } };
}

export function milestoneMessage(streak: number): Copy {
  switch (streak) {
    case 1:
      return { key: 'encouragement.milestone1' };
    case 3:
      return { key: 'encouragement.milestone3' };
    case 7:
      return { key: 'encouragement.milestone7' };
    case 14:
      return { key: 'encouragement.milestone14' };
    case 30:
      return { key: 'encouragement.milestone30' };
    case 100:
      return { key: 'encouragement.milestone100' };
    case 365:
      return { key: 'encouragement.milestone365' };
    default:
      return { key: 'encouragement.milestoneDefault', params: { count: streak } };
  }
}

/** Neutral time-of-day greeting for the home screen. */
export function greeting(now: Date | number = Date.now()): Copy {
  const hour = new Date(now).getHours();
  if (hour < 5) return { key: 'encouragement.greetingLate' };
  if (hour < 12) return { key: 'encouragement.greetingMorning' };
  if (hour < 18) return { key: 'encouragement.greetingAfternoon' };
  return { key: 'encouragement.greetingEvening' };
}

/**
 * Progress wording for an optional weekly goal.
 *
 * Even past the goal the tone stays factual — the user set the number and is
 * free to change it; the app does not get to be disappointed.
 */
export function goalStatus(current: number, goal: number): Copy & { over: boolean } {
  if (goal <= 0) return { key: 'encouragement.noGoalSet', over: false };
  const remaining = goal - current;
  if (remaining >= 0) {
    return {
      key: 'encouragement.goalRemaining',
      params: { remaining: Math.max(0, remaining).toFixed(1), goal },
      over: false,
    };
  }
  return { key: 'encouragement.goalOver', params: { over: Math.abs(remaining).toFixed(1), goal }, over: true };
}

export function freeDaysStatus(freeDays: number, goal: number): Copy {
  if (freeDays >= goal) {
    return { key: 'encouragement.freeDaysReached', params: { count: freeDays } };
  }
  const remaining = goal - freeDays;
  return { key: 'encouragement.freeDaysProgress', params: { count: freeDays, goal, remaining } };
}

/** Rotating, low-key lines for the empty history state. */
export const EMPTY_STATE_KEYS = [
  'encouragement.emptyState1',
  'encouragement.emptyState2',
  'encouragement.emptyState3',
] as const;
