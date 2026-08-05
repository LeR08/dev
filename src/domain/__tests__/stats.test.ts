import { periodRange, trailingRange } from '../dates';
import {
  alcoholFreeDays,
  averagePerDay,
  bucketize,
  categoryTotals,
  compare,
  currentAlcoholFreeStreak,
  dayFlags,
  daysSinceLastDrink,
  filterByRange,
  longestAlcoholFreeStreak,
  topDrinks,
  totals,
} from '../stats';
import { at, makeEntry } from './factories';

describe('totals', () => {
  it('sums alcohol, spend, servings and distinct days', () => {
    const entries = [
      makeEntry({ consumedAt: at(2026, 2, 1, 19), price: 6, quantity: 2 }),
      makeEntry({ consumedAt: at(2026, 2, 1, 22), price: 4 }),
      makeEntry({ consumedAt: at(2026, 2, 3, 20) }),
    ];

    const result = totals(entries);
    expect(result.entries).toBe(3);
    expect(result.servings).toBe(4);
    expect(result.spend).toBe(10);
    expect(result.drinkingDays).toBe(2);
    expect(result.grams).toBeGreaterThan(0);
  });

  it('treats a missing price as zero spend', () => {
    expect(totals([makeEntry({ price: null })]).spend).toBe(0);
  });

  it('returns zeroes for an empty log', () => {
    expect(totals([])).toEqual({ grams: 0, spend: 0, servings: 0, entries: 0, drinkingDays: 0 });
  });
});

describe('filterByRange', () => {
  it('includes the start instant and excludes the end', () => {
    const range = periodRange(at(2026, 2, 1), 'day');
    const entries = [
      makeEntry({ consumedAt: range.start }),
      makeEntry({ consumedAt: range.end - 1 }),
      makeEntry({ consumedAt: range.end }),
    ];
    expect(filterByRange(entries, range)).toHaveLength(2);
  });
});

describe('bucketize', () => {
  it('keeps empty periods so the time axis stays even', () => {
    const range = trailingRange(at(2026, 2, 10, 18), 'day', 7);
    const buckets = bucketize([makeEntry({ consumedAt: at(2026, 2, 10, 18) })], range, 'day');

    expect(buckets).toHaveLength(7);
    expect(buckets.filter((bucket) => bucket.entries > 0)).toHaveLength(1);
    expect(buckets[6].key).toBe('2026-02-10');
  });

  it('groups by week using the configured week start', () => {
    const range = trailingRange(at(2026, 2, 12), 'week', 2, 1);
    const buckets = bucketize(
      [
        makeEntry({ consumedAt: at(2026, 2, 3) }), // previous week (Tue)
        makeEntry({ consumedAt: at(2026, 2, 9) }), // current week (Mon)
        makeEntry({ consumedAt: at(2026, 2, 12) }), // current week (Thu)
      ],
      range,
      'week',
      1
    );

    expect(buckets).toHaveLength(2);
    expect(buckets[0].entries).toBe(1);
    expect(buckets[1].entries).toBe(2);
  });

  it('counts distinct drinking days inside a bucket', () => {
    const range = trailingRange(at(2026, 2, 12), 'week', 1, 1);
    const buckets = bucketize(
      [
        makeEntry({ consumedAt: at(2026, 2, 9, 19) }),
        makeEntry({ consumedAt: at(2026, 2, 9, 22) }),
        makeEntry({ consumedAt: at(2026, 2, 11, 20) }),
      ],
      range,
      'week',
      1
    );
    expect(buckets[0].drinkingDays).toBe(2);
  });

  it('ignores entries outside the range', () => {
    const range = trailingRange(at(2026, 2, 10), 'day', 3);
    const buckets = bucketize([makeEntry({ consumedAt: at(2025, 12, 25) })], range, 'day');
    expect(buckets.every((bucket) => bucket.entries === 0)).toBe(true);
  });
});

describe('categoryTotals', () => {
  it('ranks categories by alcohol and reports each share', () => {
    const result = categoryTotals([
      makeEntry({ category: 'beer', volumeMl: 500, abv: 5 }),
      makeEntry({ category: 'wine', volumeMl: 125, abv: 13 }),
      makeEntry({ category: 'wine', volumeMl: 125, abv: 13 }),
    ]);

    expect(result[0].category).toBe('wine');
    expect(result).toHaveLength(2);
    expect(result.reduce((sum, item) => sum + item.share, 0)).toBeCloseTo(1, 6);
  });

  it('is empty for an empty log', () => {
    expect(categoryTotals([])).toEqual([]);
  });
});

describe('alcohol-free streaks', () => {
  const today = at(2026, 4, 10, 14);

  it('counts today when nothing has been logged yet', () => {
    const entries = [makeEntry({ consumedAt: at(2026, 4, 7, 20) })];
    expect(currentAlcoholFreeStreak(entries, today)).toBe(3);
  });

  it('is zero on an empty log rather than counting days nobody tracked', () => {
    expect(currentAlcoholFreeStreak([], today)).toBe(0);
  });

  it('never reaches back past the first entry', () => {
    const entries = [makeEntry({ consumedAt: at(2026, 4, 9, 20) })];
    expect(currentAlcoholFreeStreak(entries, today)).toBe(1);
  });

  it('resets to zero once something is logged today', () => {
    const entries = [makeEntry({ consumedAt: at(2026, 4, 10, 12) })];
    expect(currentAlcoholFreeStreak(entries, today)).toBe(0);
  });

  it('is unbroken by multiple drinks on the same earlier day', () => {
    const entries = [
      makeEntry({ consumedAt: at(2026, 4, 8, 19) }),
      makeEntry({ consumedAt: at(2026, 4, 8, 21) }),
    ];
    expect(currentAlcoholFreeStreak(entries, today)).toBe(2);
  });

  it('finds the longest run between the first entry and today', () => {
    const entries = [
      makeEntry({ consumedAt: at(2026, 4, 1, 20) }),
      makeEntry({ consumedAt: at(2026, 4, 6, 20) }), // 4 free days in between
      makeEntry({ consumedAt: at(2026, 4, 8, 20) }),
    ];
    expect(longestAlcoholFreeStreak(entries, today)).toBe(4);
  });

  it('reports no record before anything is logged', () => {
    expect(longestAlcoholFreeStreak([], today)).toBe(0);
    expect(daysSinceLastDrink([], today)).toBeNull();
  });

  it('measures days since the most recent drink', () => {
    expect(daysSinceLastDrink([makeEntry({ consumedAt: at(2026, 4, 7, 23) })], today)).toBe(3);
  });
});

describe('day flags', () => {
  const now = at(2026, 4, 8, 12);
  const week = periodRange(now, 'week', 1); // Mon 2026-04-06 .. Sun 2026-04-12

  it('marks future days as not yet elapsed', () => {
    const flags = dayFlags([makeEntry({ consumedAt: at(2026, 4, 6, 20) })], week, now);
    expect(flags).toHaveLength(7);
    expect(flags.filter((day) => day.elapsed)).toHaveLength(3);
  });

  it('does not treat days before the first entry as tracked', () => {
    // Tracking started on the Tuesday, so the Monday is not the user's to claim.
    const flags = dayFlags([makeEntry({ consumedAt: at(2026, 4, 7, 21) })], week, now);
    expect(flags.filter((day) => day.elapsed).map((day) => day.key)).toEqual([
      '2026-04-07',
      '2026-04-08',
    ]);
  });

  it('counts nothing as elapsed on an empty log', () => {
    expect(dayFlags([], week, now).some((day) => day.elapsed)).toBe(false);
    expect(alcoholFreeDays([], week, now)).toBe(0);
  });

  it('only counts elapsed days as alcohol-free', () => {
    const entries = [makeEntry({ consumedAt: at(2026, 4, 7, 21) })];
    expect(alcoholFreeDays(entries, week, now)).toBe(1);
  });

  it('averages over elapsed days rather than the whole window', () => {
    const entries = [makeEntry({ consumedAt: at(2026, 4, 6, 20), volumeMl: 500, abv: 5 })];
    const perDay = averagePerDay(entries, week, now);
    expect(perDay).toBeCloseTo(totals(entries).grams / 3, 6);
  });
});

describe('compare', () => {
  it('returns a signed fractional change', () => {
    expect(compare(12, 10).change).toBeCloseTo(0.2, 6);
    expect(compare(8, 10).change).toBeCloseTo(-0.2, 6);
  });

  it('has no percentage to report when the previous value was zero', () => {
    expect(compare(5, 0).change).toBeNull();
  });
});

describe('topDrinks', () => {
  it('ranks by servings and merges case variants of the same drink', () => {
    const result = topDrinks([
      makeEntry({ name: 'Lager', quantity: 2 }),
      makeEntry({ name: 'lager' }),
      makeEntry({ name: 'Red wine', category: 'wine' }),
    ]);

    expect(result[0].name).toBe('Lager');
    expect(result[0].servings).toBe(3);
    expect(result).toHaveLength(2);
  });

  it('respects the limit', () => {
    const entries = ['a', 'b', 'c', 'd'].map((name) => makeEntry({ name }));
    expect(topDrinks(entries, 2)).toHaveLength(2);
  });
});
