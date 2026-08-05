import { entryGrams } from './alcohol';
import type { BiologicalSex, Entry } from './types';

/**
 * Estimated blood alcohol concentration (BAC), Widmark formula.
 *
 * This is a rough, well-known textbook estimate for informational use only —
 * it is not a medical device and does not replace a breathalyser or clinical
 * measurement. It is disclaimed everywhere it appears in the UI, and the spec
 * this implements explicitly flags the formula for review by a qualified
 * physician before any public release.
 *
 * Deliberate scope decision: only sex and weight feed the formula, using the
 * standard constant Widmark r factors (0.68 male / 0.55 female). The v1.2
 * spec's onboarding table also lists age as an input "for the Widmark r
 * factor", but the accurate age-aware refinements (e.g. the Watson total body
 * water formula) require height too — which that same spec explicitly
 * excludes from the BAC calculation. Rather than invent an unverified
 * age-adjustment constant for a health-adjacent estimate, this sticks to the
 * textbook formula and leaves age out of the maths; age is still collected
 * and used for the legal-age check and profile stats.
 */

/** Standard Widmark distribution ratio. */
export const WIDMARK_R: Record<'male' | 'female', number> = {
  male: 0.68,
  female: 0.55,
};

/** Average alcohol elimination rate, in per-mille per hour. Textbook average; varies by person. */
export const BAC_ELIMINATION_PER_HOUR = 0.15;

/**
 * Entries more than this many hours old are not part of "now"'s BAC — a drink
 * from yesterday afternoon has long since been eliminated.
 */
export const BAC_SESSION_WINDOW_HOURS = 12;

export type BacEstimate = {
  /** Estimated BAC in per-mille (‰), i.e. grams of alcohol per kg of body weight. */
  bac: number;
  /** Grams of pure alcohol counted in the current session. */
  sessionGrams: number;
  /** Hours since the first drink of the current session. */
  hoursSinceStart: number;
  sober: boolean;
};

export type BacProfile = {
  sex: BiologicalSex;
  weightKg: number | null;
};

/**
 * Estimates current BAC from a profile and the log.
 *
 * Returns null — not zero — whenever the formula cannot be honestly computed:
 * sex not given, sex "prefer not to say", or weight not given. The app must
 * never guess or silently default these values (spec v1.2 §4.1).
 */
export function estimateBac(
  profile: BacProfile | null,
  entries: Entry[],
  now: number = Date.now(),
  windowHours: number = BAC_SESSION_WINDOW_HOURS
): BacEstimate | null {
  if (!profile) return null;
  if (profile.sex !== 'male' && profile.sex !== 'female') return null;
  if (profile.weightKg === null || !isFinite(profile.weightKg) || profile.weightKg <= 0) return null;

  const windowStart = now - windowHours * 3_600_000;
  // No upper bound against `now`: callers often pass a `now` that only
  // refreshes every so often (the home screen's clock ticks once a minute),
  // so a drink logged seconds ago can have a timestamp just past that stale
  // reference. The logging form itself never lets you pick a future time, so
  // there is no real "future entry" case to guard against here — only a
  // "now was computed slightly in the past" one.
  const session = entries
    .filter((entry) => entry.consumedAt >= windowStart)
    .sort((a, b) => a.consumedAt - b.consumedAt);

  if (session.length === 0) {
    return { bac: 0, sessionGrams: 0, hoursSinceStart: 0, sober: true };
  }

  const sessionGrams = session.reduce((sum, entry) => sum + entryGrams(entry), 0);
  const hoursSinceStart = Math.max(0, (now - session[0].consumedAt) / 3_600_000);

  const r = WIDMARK_R[profile.sex];
  const raw = sessionGrams / (profile.weightKg * r) - BAC_ELIMINATION_PER_HOUR * hoursSinceStart;
  const bac = Math.max(0, raw);

  return { bac, sessionGrams, hoursSinceStart, sober: bac <= 0 };
}

/** Neutral, non-alarmist copy band for a BAC value — informational, not a warning light. */
export function bacBand(bac: number): 'none' | 'low' | 'moderate' | 'high' {
  if (bac <= 0) return 'none';
  if (bac < 0.3) return 'low';
  if (bac < 0.8) return 'moderate';
  return 'high';
}
