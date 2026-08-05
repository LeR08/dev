import type { Category, Entry, Profile, Ticket } from '../types';

let counter = 0;

/** Builds an entry with sensible defaults; override only what a test cares about. */
export function makeEntry(overrides: Partial<Entry> = {}): Entry {
  counter += 1;
  const consumedAt = overrides.consumedAt ?? new Date(2026, 0, 5, 20, 0).getTime();
  return {
    id: `entry-${counter}`,
    drinkId: null,
    name: 'Lager',
    category: 'beer' as Category,
    abv: 5,
    volumeMl: 500,
    quantity: 1,
    price: null,
    consumedAt,
    note: null,
    location: null,
    createdAt: consumedAt,
    updatedAt: consumedAt,
    ...overrides,
  };
}

/** Local-time helper so tests never depend on the machine's timezone offset. */
export function at(
  year: number,
  month: number,
  day: number,
  hours = 12,
  minutes = 0
): number {
  return new Date(year, month - 1, day, hours, minutes).getTime();
}

export function makeProfile(overrides: Partial<Profile> = {}): Profile {
  const now = at(2026, 1, 1);
  return {
    name: 'Alex',
    email: null,
    sex: 'female',
    age: 30,
    weightKg: 65,
    heightCm: 168,
    spendBeforeTrackingPerDay: 8,
    spendPeriod: 'week',
    reasons: ['curiosity'],
    otherReason: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function makeTicket(overrides: Partial<Ticket> = {}): Ticket {
  counter += 1;
  const now = overrides.createdAt ?? at(2026, 1, 1);
  return {
    id: `ticket-${counter}`,
    type: 'bug',
    title: 'Something broke',
    description: 'Steps to reproduce...',
    screenshotUri: null,
    appVersion: '1.2.0',
    platform: 'ios',
    status: 'open',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}
