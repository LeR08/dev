import type { Category, Entry } from '../types';

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
