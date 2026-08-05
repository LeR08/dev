import { periodRange } from '../dates';
import { computeSavings, savingsHeadline } from '../savings';
import { at, makeEntry } from './factories';

describe('computeSavings', () => {
  const week = periodRange(at(2026, 5, 6), 'week'); // Mon 2026-05-04 .. Sun 2026-05-10, 7 days

  it('returns null when no baseline was provided', () => {
    expect(computeSavings(null, [], week)).toBeNull();
  });

  it('computes expected spend from the daily baseline across the range', () => {
    const result = computeSavings(10, [], week);
    expect(result?.days).toBe(7);
    expect(result?.expectedSpend).toBe(70);
    expect(result?.actualSpend).toBe(0);
    expect(result?.saved).toBe(70);
    expect(result?.savedPercent).toBe(1);
  });

  it('subtracts what was actually logged with a price', () => {
    const entries = [
      makeEntry({ consumedAt: at(2026, 5, 5, 20), price: 12 }),
      makeEntry({ consumedAt: at(2026, 5, 7, 20), price: 8 }),
    ];
    const result = computeSavings(10, entries, week);
    expect(result?.actualSpend).toBe(20);
    expect(result?.saved).toBe(50);
    expect(result?.savedPercent).toBeCloseTo(50 / 70, 6);
  });

  it('reports a negative saved figure as a plain fact, not clamped to zero', () => {
    const entries = [makeEntry({ consumedAt: at(2026, 5, 5, 20), price: 150 })];
    const result = computeSavings(10, entries, week);
    expect(result?.saved).toBeLessThan(0);
    expect(result?.savedPercent).toBeLessThan(0);
  });

  it('ignores entries outside the range', () => {
    const entries = [makeEntry({ consumedAt: at(2026, 4, 1), price: 999 })];
    const result = computeSavings(10, entries, week);
    expect(result?.actualSpend).toBe(0);
  });

  it('has no percentage when the baseline is zero, but still reports the euros', () => {
    const entries = [makeEntry({ consumedAt: at(2026, 5, 5, 20), price: 12 })];
    const result = computeSavings(0, entries, week);
    expect(result?.expectedSpend).toBe(0);
    expect(result?.saved).toBe(-12);
    expect(result?.savedPercent).toBeNull();
  });
});

describe('savingsHeadline', () => {
  it('classifies without judgement either way', () => {
    expect(savingsHeadline(42)).toBe('saved');
    expect(savingsHeadline(-42)).toBe('spentMore');
    expect(savingsHeadline(0)).toBe('even');
  });
});
