import { describe, expect, it } from 'vitest';
import { expandLicenceHours, parseLicenceTime } from '@/lib/hours/parse';
import { amsterdamWallClock, badgeDescriptor, evaluateWeekly, openState, resolveHours } from '@/lib/hours/core';
import type { WeeklyHours } from '@/lib/types';

/** An instant expressed as Amsterdam wall clock, then converted back to UTC. */
function atAmsterdam(iso: string): Date {
  // `iso` is written as local Amsterdam time; find the UTC instant matching it.
  const naive = new Date(`${iso}Z`);
  for (const offsetHours of [0, 1, 2]) {
    const candidate = new Date(naive.getTime() - offsetHours * 3_600_000);
    const back = amsterdamWallClock(candidate);
    if (back.getTime() === new Date(iso).getTime()) return candidate;
  }
  throw new Error(`could not resolve ${iso} in Europe/Amsterdam`);
}

describe('parseLicenceTime', () => {
  it('accepts the HH.MM shape the licence dataset uses', () => {
    expect(parseLicenceTime('07.00')).toBe('07:00');
    expect(parseLicenceTime('1.30')).toBe('01:30');
    expect(parseLicenceTime('23.59')).toBe('23:59');
  });

  it('normalises 24.00 to midnight', () => {
    expect(parseLicenceTime('24.00')).toBe('00:00');
  });

  it('rejects the junk values that appear in real rows', () => {
    for (const junk of ['_kies', '-', '', '1 uur voor eerste activiteit', '7', '25.00', '07.61', null, undefined, 700]) {
      expect(parseLicenceTime(junk)).toBeNull();
    }
  });
});

describe('expandLicenceHours', () => {
  it('expands two licence blocks across seven days, Sunday first', () => {
    const week = expandLicenceHours({
      sunThuFrom: '07.00',
      sunThuTo: '01.00',
      friSatFrom: '07.00',
      friSatTo: '03.00',
    })!;
    expect(week).toHaveLength(7);
    expect(week[0]).toEqual([{ from: '07:00', to: '01:00' }]); // Sunday
    expect(week[4]).toEqual([{ from: '07:00', to: '01:00' }]); // Thursday
    expect(week[5]).toEqual([{ from: '07:00', to: '03:00' }]); // Friday
    expect(week[6]).toEqual([{ from: '07:00', to: '03:00' }]); // Saturday
  });

  it('keeps the valid block when only one of the two parses', () => {
    const week = expandLicenceHours({
      sunThuFrom: '07.00',
      sunThuTo: '01.00',
      friSatFrom: '_kies',
      friSatTo: '-',
    })!;
    expect(week[1]).toEqual([{ from: '07:00', to: '01:00' }]);
    expect(week[5]).toEqual([]);
  });

  it('returns null when neither block parses', () => {
    expect(expandLicenceHours({ sunThuFrom: '-', sunThuTo: '-', friSatFrom: '', friSatTo: '' })).toBeNull();
  });

  it('discards a zero-length block', () => {
    expect(expandLicenceHours({ sunThuFrom: '07.00', sunThuTo: '07.00', friSatFrom: '', friSatTo: '' })).toBeNull();
  });
});

describe('overnight evaluation', () => {
  const week = expandLicenceHours({
    sunThuFrom: '07.00',
    sunThuTo: '01.00',
    friSatFrom: '07.00',
    friSatTo: '03.00',
  })! as WeeklyHours;

  it('is open at 00:30 on a Tuesday, inside Monday 07:00-01:00', () => {
    // 2026-08-18 is a Tuesday.
    const state = evaluateWeekly(week, new Date(2026, 7, 18, 0, 30));
    expect(state.kind).toBe('open');
    if (state.kind === 'open') {
      expect(state.until).toBe('01:00');
      expect(state.minutesLeft).toBe(30);
      expect(state.closingSoon).toBe(true);
    }
  });

  it('is closed at 06:00, between the overnight block and opening', () => {
    const state = evaluateWeekly(week, new Date(2026, 7, 18, 6, 0));
    expect(state.kind).toBe('closed');
    if (state.kind === 'closed') expect(state.opensAt).toBe('07:00');
  });

  it('is open at 08:00 and at 14:00', () => {
    expect(evaluateWeekly(week, new Date(2026, 7, 18, 8, 0)).kind).toBe('open');
    expect(evaluateWeekly(week, new Date(2026, 7, 18, 14, 0)).kind).toBe('open');
  });

  it('closes at 03:00 on Saturday night, so 02:30 Sunday is still open', () => {
    // 2026-08-23 is a Sunday; the covering block starts Saturday the 22nd.
    const state = evaluateWeekly(week, new Date(2026, 7, 23, 2, 30));
    expect(state.kind).toBe('open');
    if (state.kind === 'open') expect(state.until).toBe('03:00');
  });

  it('is closed at 02:30 on a Tuesday, because Monday closes at 01:00', () => {
    expect(evaluateWeekly(week, new Date(2026, 7, 18, 2, 30)).kind).toBe('closed');
  });

  it('flags closing soon only inside the last hour', () => {
    const soon = evaluateWeekly(week, new Date(2026, 7, 18, 0, 30));
    const notSoon = evaluateWeekly(week, new Date(2026, 7, 17, 22, 0));
    expect(soon.kind === 'open' && soon.closingSoon).toBe(true);
    expect(notSoon.kind === 'open' && notSoon.closingSoon).toBe(false);
  });

  it('rolls over to the next day when today has no remaining block', () => {
    const mondayOnly: WeeklyHours = [[], [{ from: '10:00', to: '12:00' }], [], [], [], [], []];
    const state = evaluateWeekly(mondayOnly, new Date(2026, 7, 18, 13, 0)); // Tuesday
    expect(state.kind).toBe('closed');
    if (state.kind === 'closed') {
      expect(state.opensAt).toBe('10:00');
      expect(state.opensDay).toBe(1);
    }
  });
});

describe('timezone independence', () => {
  it('evaluates in Europe/Amsterdam regardless of the device clock', () => {
    const week = expandLicenceHours({
      sunThuFrom: '07.00',
      sunThuTo: '01.00',
      friSatFrom: '07.00',
      friSatTo: '03.00',
    });
    const venue = {
      status: 'open' as const,
      hours_actual: null,
      hours_source: 'licence' as const,
      hours_updated_at: null,
      hours_licensed: week,
      hours_weekly: week,
    };
    // 00:30 Amsterdam on a Tuesday — 22:30 UTC on the Monday in summer time.
    const instant = atAmsterdam('2026-08-18T00:30:00');
    expect(instant.toISOString()).toBe('2026-08-17T22:30:00.000Z');
    expect(openState(venue, instant).kind).toBe('open');
  });
});

describe('tier selection', () => {
  const licensed = expandLicenceHours({
    sunThuFrom: '07.00',
    sunThuTo: '01.00',
    friSatFrom: '07.00',
    friSatTo: '01.00',
  });

  it('prefers expanded OSM intervals over the licence bound', () => {
    const venue = {
      status: 'open' as const,
      hours_source: 'osm' as const,
      hours_actual: 'Mo-Su 10:00-22:00',
      hours_licensed: licensed,
      hours_weekly: [
        [{ from: '10:00', to: '22:00' }],
        [{ from: '10:00', to: '22:00' }],
        [{ from: '10:00', to: '22:00' }],
        [{ from: '10:00', to: '22:00' }],
        [{ from: '10:00', to: '22:00' }],
        [{ from: '10:00', to: '22:00' }],
        [{ from: '10:00', to: '22:00' }],
      ],
      hours_updated_at: null,
    };
    // Licensed until 01:00, but the venue actually shuts at 22:00.
    expect(openState(venue, atAmsterdam('2026-08-18T23:00:00')).kind).toBe('closed');
    expect(resolveHours(venue).qualified).toBe(false);
  });

  it('marks the licence tier as needing a qualifier', () => {
    const resolved = resolveHours({
      hours_source: 'licence',
      hours_actual: null,
      hours_licensed: licensed,
      hours_weekly: licensed,
      hours_updated_at: null,
    });
    expect(resolved.source).toBe('licence');
    expect(resolved.qualified).toBe(true);
  });

  it('reports unknown when no tier carries data', () => {
    const venue = {
      status: 'open' as const,
      hours_source: null,
      hours_actual: null,
      hours_licensed: null,
      hours_weekly: null,
      hours_updated_at: null,
    };
    expect(openState(venue, new Date()).kind).toBe('unknown');
    expect(resolveHours(venue).source).toBeNull();
  });
});

describe('badge descriptor', () => {
  it('never collapses an unknown state into closed', () => {
    expect(badgeDescriptor({ kind: 'unknown' })).toEqual({ key: 'unknown', tone: 'unknown' });
  });

  it('carries the closing time as data, for the locale to phrase', () => {
    expect(badgeDescriptor({ kind: 'open', until: '01:00', closingSoon: false, minutesLeft: 200 })).toEqual(
      { key: 'openUntil', time: '01:00', tone: 'open' },
    );
    expect(badgeDescriptor({ kind: 'open', until: '01:00', closingSoon: true, minutesLeft: 20 })).toEqual(
      { key: 'closingSoon', time: '01:00', tone: 'soon' },
    );
    expect(badgeDescriptor({ kind: 'closed', opensAt: '07:00', opensDay: 2 })).toEqual(
      { key: 'opensAt', time: '07:00', tone: 'closed' },
    );
  });
});
