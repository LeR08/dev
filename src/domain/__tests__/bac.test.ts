import { BAC_ELIMINATION_PER_HOUR, WIDMARK_R, bacBand, estimateBac } from '../bac';
import { at, makeEntry } from './factories';

describe('estimateBac', () => {
  const now = at(2026, 4, 10, 22);

  it('is disabled without a profile', () => {
    expect(estimateBac(null, [])).toBeNull();
  });

  it('is disabled when sex is unspecified rather than guessing', () => {
    expect(estimateBac({ sex: 'unspecified', weightKg: 70 }, [], now)).toBeNull();
  });

  it('is disabled when weight is missing, even with a known sex', () => {
    expect(estimateBac({ sex: 'male', weightKg: null }, [], now)).toBeNull();
  });

  it('is disabled for a non-positive weight', () => {
    expect(estimateBac({ sex: 'female', weightKg: 0 }, [], now)).toBeNull();
  });

  it('reports sober with zero grams when nothing was logged in the session window', () => {
    const result = estimateBac({ sex: 'male', weightKg: 80 }, [], now);
    expect(result).toEqual({ bac: 0, sessionGrams: 0, hoursSinceStart: 0, sober: true });
  });

  it('ignores drinks from well outside the session window', () => {
    const entries = [makeEntry({ consumedAt: at(2026, 4, 9, 20), volumeMl: 500, abv: 5 })];
    const result = estimateBac({ sex: 'male', weightKg: 80 }, entries, now);
    expect(result?.sober).toBe(true);
    expect(result?.sessionGrams).toBe(0);
  });

  it('computes a positive BAC right after drinking starts', () => {
    const entries = [makeEntry({ consumedAt: now - 5 * 60_000, volumeMl: 500, abv: 5 })];
    const result = estimateBac({ sex: 'male', weightKg: 80 }, entries, now);

    expect(result?.sober).toBe(false);
    expect(result?.bac).toBeGreaterThan(0);
    // Hand-computed against the textbook formula, including the small amount
    // of elimination that has already happened in those five minutes.
    const grams = 500 * 0.05 * 0.789;
    const expected = grams / (80 * WIDMARK_R.male) - BAC_ELIMINATION_PER_HOUR * (5 / 60);
    expect(result?.bac).toBeCloseTo(expected, 2);
  });

  it('never goes negative once elimination outruns intake', () => {
    const entries = [makeEntry({ consumedAt: now - 11 * 3_600_000, volumeMl: 250, abv: 5 })];
    const result = estimateBac({ sex: 'female', weightKg: 60 }, entries, now);
    expect(result?.bac).toBe(0);
    expect(result?.sober).toBe(true);
  });

  it('eliminates over time at the documented rate', () => {
    const entries = [makeEntry({ consumedAt: now - 2 * 3_600_000, volumeMl: 500, abv: 5 })];
    const result = estimateBac({ sex: 'male', weightKg: 80 }, entries, now);
    const grams = 500 * 0.05 * 0.789;
    const expected = Math.max(0, grams / (80 * WIDMARK_R.male) - BAC_ELIMINATION_PER_HOUR * 2);
    expect(result?.bac).toBeCloseTo(expected, 2);
  });

  it('sums multiple drinks in the same session', () => {
    const entries = [
      makeEntry({ consumedAt: now - 60 * 60_000, volumeMl: 330, abv: 5 }),
      makeEntry({ consumedAt: now - 10 * 60_000, volumeMl: 125, abv: 13 }),
    ];
    const result = estimateBac({ sex: 'female', weightKg: 65 }, entries, now);
    expect(result?.sessionGrams).toBeGreaterThan(0);
    expect(result?.hoursSinceStart).toBeCloseTo(1, 1);
  });

  it('still counts a drink logged after the caller\'s `now`', () => {
    // The home screen's clock only ticks once a minute (useNow), so a drink
    // logged right after render can carry a timestamp a few seconds ahead of
    // the `now` this function was called with. It must not be dropped.
    const entries = [makeEntry({ consumedAt: now + 30_000, volumeMl: 500, abv: 5 })];
    const result = estimateBac({ sex: 'male', weightKg: 80 }, entries, now);
    expect(result?.sober).toBe(false);
    expect(result?.sessionGrams).toBeGreaterThan(0);
  });
});

describe('bacBand', () => {
  it('buckets into neutral, non-alarmist bands', () => {
    expect(bacBand(0)).toBe('none');
    expect(bacBand(0.15)).toBe('low');
    expect(bacBand(0.5)).toBe('moderate');
    expect(bacBand(1.2)).toBe('high');
  });
});
