import {
  addDays,
  addMonths,
  dayKey,
  daysBetween,
  eachDay,
  eachPeriod,
  periodRange,
  previousRange,
  startOfDay,
  startOfMonth,
  startOfWeek,
  trailingRange,
} from '../dates';
import { at } from './factories';

describe('day boundaries', () => {
  it('starts the day at local midnight', () => {
    const start = startOfDay(at(2026, 3, 14, 23, 45));
    expect(start.getHours()).toBe(0);
    expect(start.getDate()).toBe(14);
  });

  it('keys days by local calendar date', () => {
    expect(dayKey(at(2026, 3, 14, 23, 59))).toBe('2026-03-14');
    expect(dayKey(at(2026, 3, 15, 0, 1))).toBe('2026-03-15');
  });
});

describe('startOfWeek', () => {
  it('rolls back to Monday by default', () => {
    // 2026-01-08 is a Thursday.
    expect(dayKey(startOfWeek(at(2026, 1, 8)))).toBe('2026-01-05');
  });

  it('supports Sunday as the first day', () => {
    expect(dayKey(startOfWeek(at(2026, 1, 8), 0))).toBe('2026-01-04');
  });

  it('leaves a day that is already the week start untouched', () => {
    expect(dayKey(startOfWeek(at(2026, 1, 5)))).toBe('2026-01-05');
  });
});

describe('addMonths', () => {
  it('clamps to the last day of a shorter month', () => {
    expect(dayKey(addMonths(at(2026, 1, 31), 1))).toBe('2026-02-28');
  });

  it('steps backwards across a year boundary', () => {
    expect(dayKey(addMonths(at(2026, 1, 15), -1))).toBe('2025-12-15');
  });
});

describe('ranges', () => {
  it('builds a single-day range that excludes the next midnight', () => {
    const range = periodRange(at(2026, 5, 4, 9), 'day');
    expect(dayKey(range.start)).toBe('2026-05-04');
    expect(dayKey(range.end)).toBe('2026-05-05');
    expect(range.end - range.start).toBe(86_400_000);
  });

  it('builds a week range of seven days', () => {
    const range = periodRange(at(2026, 5, 6), 'week');
    expect(eachDay(range.start, range.end)).toHaveLength(7);
  });

  it('covers exactly the requested number of trailing days', () => {
    const range = trailingRange(at(2026, 5, 20, 15), 'day', 7);
    const days = eachDay(range.start, range.end);
    expect(days).toHaveLength(7);
    expect(dayKey(days[0])).toBe('2026-05-14');
    expect(dayKey(days[6])).toBe('2026-05-20');
  });

  it('covers twelve months for a trailing year', () => {
    const range = trailingRange(at(2026, 5, 20), 'month', 12);
    expect(eachPeriod(range.start, range.end, 'month')).toHaveLength(12);
    expect(dayKey(range.start)).toBe('2025-06-01');
  });

  it('finds the equivalent previous period', () => {
    const week = periodRange(at(2026, 5, 6), 'week');
    const before = previousRange(week, 'week');
    expect(before.end).toBe(week.start);
    expect(week.end - week.start).toBe(before.end - before.start);
  });

  it('starts months on the first', () => {
    expect(dayKey(startOfMonth(at(2026, 7, 23)))).toBe('2026-07-01');
  });
});

describe('daysBetween', () => {
  it('counts calendar days regardless of time of day', () => {
    expect(daysBetween(at(2026, 1, 1, 23), at(2026, 1, 2, 1))).toBe(1);
    expect(daysBetween(at(2026, 1, 1), at(2026, 1, 1, 23))).toBe(0);
    expect(daysBetween(at(2026, 1, 10), at(2026, 1, 1))).toBe(-9);
  });

  it('stays exact across a daylight-saving boundary', () => {
    // Europe springs forward on 2026-03-29; the day count must still be 1.
    expect(daysBetween(at(2026, 3, 28, 12), at(2026, 3, 29, 12))).toBe(1);
    expect(dayKey(addDays(at(2026, 3, 28, 12), 1))).toBe('2026-03-29');
  });
});
