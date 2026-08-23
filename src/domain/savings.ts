import { filterByRange, totals } from './stats';
import type { Range } from './dates';
import type { Entry } from './types';

/**
 * Money saved (or not) relative to what the user says they used to spend.
 *
 * Lives in its own module rather than inside stats.ts (which the v1.2 spec
 * suggests as the location) purely to keep that already-large file focused —
 * it is still a pure function next to the rest of the domain layer, built on
 * top of the same `totals`/`filterByRange` helpers everything else uses, so
 * it can never disagree with the numbers shown elsewhere.
 */
export type Savings = {
  /** Days covered by the range. */
  days: number;
  /** What the baseline daily rate would have cost over that many days. */
  expectedSpend: number;
  /** What was actually logged with a price, over the same days. */
  actualSpend: number;
  /** expectedSpend − actualSpend. Positive means spending less than before. */
  saved: number;
  /** saved as a fraction of expectedSpend. Null when there is no baseline to compare against. */
  savedPercent: number | null;
};

/**
 * @param baselineDailySpend What the user reports having spent per day before
 *   tracking, or null if they skipped that question — callers should not call
 *   this with a baseline of 0 to mean "skipped"; use null.
 * @param entries The full log; narrowed to `range` internally.
 * @param range The window to compare over.
 */
export function computeSavings(
  baselineDailySpend: number | null,
  entries: Entry[],
  range: Range
): Savings | null {
  if (baselineDailySpend === null) return null;

  const days = Math.max(0, (range.end - range.start) / 86_400_000);
  const expectedSpend = baselineDailySpend * days;
  const actualSpend = totals(filterByRange(entries, range)).spend;
  const saved = expectedSpend - actualSpend;

  return {
    days,
    expectedSpend,
    actualSpend,
    saved,
    savedPercent: expectedSpend > 0 ? saved / expectedSpend : null,
  };
}

/**
 * Copy for the savings headline. Deliberately neutral either way — spending
 * more than the baseline is reported as a fact, not a failure (spec v1.2 §7.3:
 * "no shame framing if 'saved' is negative").
 */
export function savingsHeadline(saved: number): 'saved' | 'spentMore' | 'even' {
  if (Math.abs(saved) < 0.005) return 'even';
  return saved > 0 ? 'saved' : 'spentMore';
}
