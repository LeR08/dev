import type { Range } from '@/domain/dates';
import {
  DEFAULT_SETTINGS,
  type Drink,
  type DrinkInput,
  type Entry,
  type EntryInput,
  type Settings,
} from '@/domain/types';
import { CATALOG_VERSION, SEED_DRINKS, seedToDrink } from './seed';
import { newId, type Store } from './store';

const STORAGE_KEY = 'tally:v1';

type Snapshot = {
  catalogVersion: number;
  drinks: Drink[];
  entries: Entry[];
  settings: Partial<Settings>;
};

function emptySnapshot(): Snapshot {
  return { catalogVersion: 0, drinks: [], entries: [], settings: {} };
}

/**
 * Browser store, used when the app runs as a PWA.
 *
 * The whole snapshot is written on every mutation. That is fine at personal
 * scale — a few thousand entries — and it keeps writes atomic: localStorage
 * either takes the new JSON or keeps the old one, so a failed write can never
 * leave a half-updated log.
 *
 * Falls back to memory-only when there is no window (server-side prerender of
 * the static web build, and unit tests).
 */
export class WebStore implements Store {
  private snapshot: Snapshot = emptySnapshot();
  private ready = false;

  private get storage(): Storage | null {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return null;
      return window.localStorage;
    } catch {
      return null;
    }
  }

  async init(): Promise<void> {
    if (this.ready) return;
    this.snapshot = this.read();
    this.seedCatalog();
    this.ready = true;
  }

  private read(): Snapshot {
    const raw = this.storage?.getItem(STORAGE_KEY);
    if (!raw) return emptySnapshot();
    try {
      const parsed = JSON.parse(raw) as Partial<Snapshot>;
      return {
        catalogVersion: parsed.catalogVersion ?? 0,
        drinks: parsed.drinks ?? [],
        entries: parsed.entries ?? [],
        settings: parsed.settings ?? {},
      };
    } catch {
      // Unparseable data is left in place rather than overwritten, so it can
      // still be recovered by hand if it ever matters.
      return emptySnapshot();
    }
  }

  private persist(): void {
    this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.snapshot));
  }

  /** Adds catalog drinks that aren't stored yet; never touches existing rows. */
  private seedCatalog(): void {
    const known = new Set(this.snapshot.drinks.map((drink) => drink.id));
    const now = Date.now();
    const missing = SEED_DRINKS.filter((seed) => !known.has(seed.id)).map((seed) =>
      seedToDrink(seed, now)
    );
    if (missing.length === 0 && this.snapshot.catalogVersion === CATALOG_VERSION) return;
    this.snapshot.drinks = [...this.snapshot.drinks, ...missing];
    this.snapshot.catalogVersion = CATALOG_VERSION;
    this.persist();
  }

  async listDrinks(options?: { includeArchived?: boolean }): Promise<Drink[]> {
    return this.snapshot.drinks
      .filter((drink) => options?.includeArchived || !drink.archived)
      .sort((a, b) => {
        if (a.isCustom !== b.isCustom) return a.isCustom ? -1 : 1;
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      });
  }

  async getDrink(id: string): Promise<Drink | null> {
    return this.snapshot.drinks.find((drink) => drink.id === id) ?? null;
  }

  async createDrink(input: DrinkInput): Promise<Drink> {
    const now = Date.now();
    const drink: Drink = {
      id: newId(),
      name: input.name,
      category: input.category,
      abv: input.abv,
      defaultVolumeMl: input.defaultVolumeMl,
      defaultPrice: input.defaultPrice ?? null,
      isCustom: true,
      archived: false,
      createdAt: now,
      updatedAt: now,
    };
    this.snapshot.drinks = [...this.snapshot.drinks, drink];
    this.persist();
    return drink;
  }

  async updateDrink(id: string, patch: Partial<DrinkInput> & { archived?: boolean }): Promise<Drink> {
    const existing = await this.getDrink(id);
    if (!existing) throw new Error(`Drink ${id} not found`);
    const next: Drink = {
      ...existing,
      ...patch,
      defaultPrice: patch.defaultPrice === undefined ? existing.defaultPrice : patch.defaultPrice,
      updatedAt: Date.now(),
    };
    this.snapshot.drinks = this.snapshot.drinks.map((drink) => (drink.id === id ? next : drink));
    this.persist();
    return next;
  }

  async deleteDrink(id: string): Promise<void> {
    this.snapshot.drinks = this.snapshot.drinks.filter((drink) => drink.id !== id);
    this.snapshot.entries = this.snapshot.entries.map((entry) =>
      entry.drinkId === id ? { ...entry, drinkId: null } : entry
    );
    this.persist();
  }

  async listEntries(options?: { range?: Range; limit?: number }): Promise<Entry[]> {
    let entries = [...this.snapshot.entries];
    if (options?.range) {
      const { start, end } = options.range;
      entries = entries.filter((entry) => entry.consumedAt >= start && entry.consumedAt < end);
    }
    entries.sort((a, b) => b.consumedAt - a.consumedAt || b.createdAt - a.createdAt);
    return options?.limit ? entries.slice(0, options.limit) : entries;
  }

  async getEntry(id: string): Promise<Entry | null> {
    return this.snapshot.entries.find((entry) => entry.id === id) ?? null;
  }

  async createEntry(input: EntryInput): Promise<Entry> {
    const now = Date.now();
    const entry: Entry = {
      id: newId(),
      drinkId: input.drinkId,
      name: input.name,
      category: input.category,
      abv: input.abv,
      volumeMl: input.volumeMl,
      quantity: input.quantity,
      price: input.price ?? null,
      consumedAt: input.consumedAt,
      note: input.note ?? null,
      location: input.location ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.snapshot.entries = [...this.snapshot.entries, entry];
    this.persist();
    return entry;
  }

  async updateEntry(id: string, patch: Partial<EntryInput>): Promise<Entry> {
    const existing = await this.getEntry(id);
    if (!existing) throw new Error(`Entry ${id} not found`);
    const next: Entry = {
      ...existing,
      ...patch,
      price: patch.price === undefined ? existing.price : patch.price,
      note: patch.note === undefined ? existing.note : patch.note,
      location: patch.location === undefined ? existing.location : patch.location,
      updatedAt: Date.now(),
    };
    this.snapshot.entries = this.snapshot.entries.map((entry) => (entry.id === id ? next : entry));
    this.persist();
    return next;
  }

  async deleteEntry(id: string): Promise<void> {
    this.snapshot.entries = this.snapshot.entries.filter((entry) => entry.id !== id);
    this.persist();
  }

  async getSettings(): Promise<Partial<Settings>> {
    const stored = this.snapshot.settings ?? {};
    const settings: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(stored)) {
      if (key in DEFAULT_SETTINGS) settings[key] = value;
    }
    return settings as Partial<Settings>;
  }

  async saveSettings(settings: Settings): Promise<void> {
    this.snapshot.settings = settings;
    this.persist();
  }

  async clearAll(): Promise<void> {
    this.snapshot = emptySnapshot();
    this.persist();
    this.seedCatalog();
  }
}
