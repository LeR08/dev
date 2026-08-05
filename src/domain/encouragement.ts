/**
 * Copy helpers.
 *
 * House rules for anything written here: never scold, never imply failure, and
 * never call a number "too much". The app reports what happened and celebrates
 * what the user chose to do — deciding what it means is their job, not ours.
 */

import { pluralize } from './format';

export const STREAK_MILESTONES = [1, 2, 3, 7, 10, 14, 21, 30, 50, 60, 90, 100, 150, 180, 270, 365];

export function nextMilestone(streak: number): number | null {
  return STREAK_MILESTONES.find((milestone) => milestone > streak) ?? null;
}

export function isMilestone(streak: number): boolean {
  return STREAK_MILESTONES.includes(streak);
}

/** Headline for the alcohol-free streak card. */
export function streakHeadline(streak: number): string {
  if (streak === 0) return 'Tracking today';
  if (streak === 1) return '1 alcohol-free day';
  return `${streak} alcohol-free days`;
}

export function streakSubtitle(streak: number): string {
  if (streak === 0) return 'Every day logged is useful data. No judgement here.';
  if (streak === 1) return 'Day one counts. Nice.';
  if (streak < 7) return 'A run is forming.';

  const next = nextMilestone(streak);
  if (next === null) return 'Remarkable run.';
  const remaining = next - streak;
  return `${remaining} more ${pluralize(remaining, 'day')} to reach ${next}.`;
}

export function milestoneMessage(streak: number): string {
  switch (streak) {
    case 1:
      return 'First alcohol-free day logged.';
    case 3:
      return 'Three days in a row.';
    case 7:
      return 'A full alcohol-free week.';
    case 14:
      return 'Two weeks. That is a real stretch.';
    case 30:
      return 'A whole month.';
    case 100:
      return 'One hundred days.';
    case 365:
      return 'A full year.';
    default:
      return `${streak} alcohol-free days in a row.`;
  }
}

/** Neutral time-of-day greeting for the home screen. */
export function greeting(now: Date | number = Date.now()): string {
  const hour = new Date(now).getHours();
  if (hour < 5) return 'Late one';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Progress wording for an optional weekly goal.
 *
 * Even past the goal the tone stays factual — the user set the number and is
 * free to change it; the app does not get to be disappointed.
 */
export function goalStatus(current: number, goal: number): { label: string; over: boolean } {
  if (goal <= 0) return { label: 'No goal set', over: false };
  const remaining = goal - current;
  if (remaining >= 0) {
    return { label: `${Math.max(0, remaining).toFixed(1)} left of your ${goal} this week`, over: false };
  }
  return { label: `${Math.abs(remaining).toFixed(1)} above the ${goal} you set`, over: true };
}

export function freeDaysStatus(freeDays: number, goal: number): string {
  if (freeDays >= goal) {
    return `${freeDays} alcohol-free ${pluralize(freeDays, 'day')} this week — goal reached.`;
  }
  const remaining = goal - freeDays;
  return `${freeDays} of ${goal} alcohol-free days so far. ${remaining} to go.`;
}

/** Rotating, low-key lines for the empty history state. */
export const EMPTY_STATE_LINES = [
  'Nothing logged yet. Add a drink whenever you like.',
  'Your log is private and stays on this device.',
  'Start whenever. There is no streak to break here.',
];
