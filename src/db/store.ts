import type { Range } from '@/domain/dates';
import type { Drink, DrinkInput, Entry, EntryInput, Settings } from '@/domain/types';

/**
 * Storage contract.
 *
 * Everything above this line is platform-agnostic. On device the implementation
 * is SQLite (src/db/sqlite.ts); in a browser it is a localStorage-backed store
 * (src/db/web.ts) so the app can be developed and tested as a PWA.
 *
 * Aggregation deliberately does *not* live here. The store narrows entries by
 * date range — the one query that benefits from an index — and the pure
 * functions in src/domain do the grouping, so the two backends can never drift
 * apart on the numbers they report.
 */
export interface Store {
  /** Open the database, run migrations, seed the catalog. Idempotent. */
  init(): Promise<void>;

  listDrinks(options?: { includeArchived?: boolean }): Promise<Drink[]>;
  getDrink(id: string): Promise<Drink | null>;
  createDrink(input: DrinkInput): Promise<Drink>;
  updateDrink(id: string, patch: Partial<DrinkInput> & { archived?: boolean }): Promise<Drink>;
  /** Deletes a drink preset. Entries that referenced it are kept intact. */
  deleteDrink(id: string): Promise<void>;

  listEntries(options?: { range?: Range; limit?: number }): Promise<Entry[]>;
  getEntry(id: string): Promise<Entry | null>;
  createEntry(input: EntryInput): Promise<Entry>;
  updateEntry(id: string, patch: Partial<EntryInput>): Promise<Entry>;
  deleteEntry(id: string): Promise<void>;

  getSettings(): Promise<Partial<Settings>>;
  saveSettings(settings: Settings): Promise<void>;

  /** Wipes entries, custom drinks and settings, then re-seeds the catalog. */
  clearAll(): Promise<void>;
}

export type Backup = {
  app: 'tally';
  formatVersion: 1;
  exportedAt: number;
  settings: Partial<Settings>;
  customDrinks: Drink[];
  entries: Entry[];
};

/** Collision-resistant enough for a single-user local log. */
export function newId(): string {
  const globalCrypto = globalThis.crypto as { randomUUID?: () => string } | undefined;
  if (typeof globalCrypto?.randomUUID === 'function') {
    return globalCrypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
