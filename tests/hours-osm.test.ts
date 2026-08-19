import { describe, expect, it } from 'vitest';
import { expandOsmHours, weekStartFor } from '@/etl/hours-osm';
import { evaluateWeekly } from '@/lib/hours/core';

// 2026-08-17 is a Monday.
const MONDAY = new Date(2026, 7, 17);

describe('expandOsmHours', () => {
  it('expands a simple all-week rule onto every day', () => {
    const week = expandOsmHours('Mo-Su 10:00-22:00', 52.37, 4.89, MONDAY)!;
    expect(week).toHaveLength(7);
    for (const day of week) expect(day).toEqual([{ from: '10:00', to: '22:00' }]);
  });

  it('keeps an overnight block on the day it starts', () => {
    const week = expandOsmHours('Mo-Su 07:00-01:00', 52.37, 4.89, MONDAY)!;
    // One block on the day it opens, not a fragment either side of midnight.
    expect(week[1]).toEqual([{ from: '07:00', to: '01:00' }]);
    // Which the evaluator then reads as running into Tuesday.
    expect(evaluateWeekly(week, new Date(2026, 7, 18, 0, 30)).kind).toBe('open');
  });

  it('honours a day the venue is closed', () => {
    const week = expandOsmHours('Mo-Sa 10:00-20:00; Su off', 52.37, 4.89, MONDAY)!;
    expect(week[0]).toEqual([]); // Sunday
    expect(week[1]).toEqual([{ from: '10:00', to: '20:00' }]);
  });

  it('expands a split day into two blocks', () => {
    const week = expandOsmHours('Mo 09:00-12:00,14:00-18:00', 52.37, 4.89, MONDAY)!;
    expect(week[1]).toEqual([
      { from: '09:00', to: '12:00' },
      { from: '14:00', to: '18:00' },
    ]);
  });

  it('applies a Dutch public-holiday rule to the day it falls on', () => {
    // 2026-12-25 is Christmas Day, a Friday.
    const christmasWeek = new Date(2026, 11, 21);
    const week = expandOsmHours('Mo-Su 10:00-22:00; PH off', 52.37, 4.89, christmasWeek)!;
    expect(week[5]).toEqual([]); // Friday 25 December
    expect(week[4]).toEqual([{ from: '10:00', to: '22:00' }]); // Thursday 24th
  });

  it('returns null for a rule the parser rejects rather than guessing', () => {
    expect(expandOsmHours('whenever the owner feels like it', 52.37, 4.89, MONDAY)).toBeNull();
  });

  it('returns null when a rule never opens', () => {
    expect(expandOsmHours('off', 52.37, 4.89, MONDAY)).toBeNull();
  });
});

describe('weekStartFor', () => {
  it('anchors on the Amsterdam calendar day, not the UTC one', () => {
    // 22:30 UTC on 17 August is already the 18th in Amsterdam.
    const start = weekStartFor(new Date('2026-08-17T22:30:00Z'));
    expect(start.getDate()).toBe(18);
    expect(start.getHours()).toBe(0);
  });
});
