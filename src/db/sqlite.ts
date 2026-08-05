import * as SQLite from 'expo-sqlite';

import type { Range } from '@/domain/dates';
import {
  DEFAULT_SETTINGS,
  type BiologicalSex,
  type Category,
  type Drink,
  type DrinkInput,
  type Entry,
  type EntryInput,
  type Profile,
  type ReasonKey,
  type Settings,
  type SpendPeriod,
  type Ticket,
  type TicketInput,
  type TicketStatus,
  type TicketType,
} from '@/domain/types';
import { CATALOG_VERSION, SEED_DRINKS } from './seed';
import { newId, type Store } from './store';

export const DATABASE_NAME = 'tally.db';

const SCHEMA_VERSION = 2;

type DrinkRow = {
  id: string;
  name: string;
  category: string;
  abv: number;
  default_volume_ml: number;
  default_price: number | null;
  is_custom: number;
  archived: number;
  created_at: number;
  updated_at: number;
};

type EntryRow = {
  id: string;
  drink_id: string | null;
  name: string;
  category: string;
  abv: number;
  volume_ml: number;
  quantity: number;
  price: number | null;
  consumed_at: number;
  note: string | null;
  location: string | null;
  created_at: number;
  updated_at: number;
};

function toDrink(row: DrinkRow): Drink {
  return {
    id: row.id,
    name: row.name,
    category: row.category as Category,
    abv: row.abv,
    defaultVolumeMl: row.default_volume_ml,
    defaultPrice: row.default_price,
    isCustom: row.is_custom === 1,
    archived: row.archived === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toEntry(row: EntryRow): Entry {
  return {
    id: row.id,
    drinkId: row.drink_id,
    name: row.name,
    category: row.category as Category,
    abv: row.abv,
    volumeMl: row.volume_ml,
    quantity: row.quantity,
    price: row.price,
    consumedAt: row.consumed_at,
    note: row.note,
    location: row.location,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

type ProfileRow = {
  sex: string;
  age: number | null;
  weight_kg: number | null;
  height_cm: number | null;
  spend_before_tracking_per_day: number | null;
  spend_period: string;
  reasons: string;
  other_reason: string | null;
  created_at: number;
  updated_at: number;
};

function toProfile(row: ProfileRow): Profile {
  let reasons: ReasonKey[] = [];
  try {
    reasons = JSON.parse(row.reasons);
  } catch {
    reasons = [];
  }
  return {
    sex: row.sex as BiologicalSex,
    age: row.age,
    weightKg: row.weight_kg,
    heightCm: row.height_cm,
    spendBeforeTrackingPerDay: row.spend_before_tracking_per_day,
    spendPeriod: row.spend_period as SpendPeriod,
    reasons,
    otherReason: row.other_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

type TicketRow = {
  id: string;
  type: string;
  title: string;
  description: string;
  screenshot_uri: string | null;
  app_version: string;
  platform: string;
  status: string;
  created_at: number;
  updated_at: number;
};

function toTicket(row: TicketRow): Ticket {
  return {
    id: row.id,
    type: row.type as TicketType,
    title: row.title,
    description: row.description,
    screenshotUri: row.screenshot_uri,
    appVersion: row.app_version,
    platform: row.platform,
    status: row.status as TicketStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * SQLite-backed store for iOS and Android.
 *
 * Writes go through short transactions and the database runs in WAL mode, so a
 * crash mid-write leaves the log consistent rather than half-applied.
 */
export class SqliteStore implements Store {
  private db: SQLite.SQLiteDatabase | null = null;
  private ready: Promise<void> | null = null;

  async init(): Promise<void> {
    if (!this.ready) {
      this.ready = this.open();
    }
    return this.ready;
  }

  private async open(): Promise<void> {
    const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
    await db.execAsync('PRAGMA journal_mode = WAL;');
    await db.execAsync('PRAGMA foreign_keys = ON;');
    this.db = db;
    await this.migrate(db);
    await this.seedCatalog(db);
  }

  private get database(): SQLite.SQLiteDatabase {
    if (!this.db) {
      throw new Error('Store used before init(). Call init() first.');
    }
    return this.db;
  }

  private async migrate(db: SQLite.SQLiteDatabase): Promise<void> {
    const result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    const current = result?.user_version ?? 0;
    if (current >= SCHEMA_VERSION) return;

    if (current < 1) {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS drinks (
          id TEXT PRIMARY KEY NOT NULL,
          name TEXT NOT NULL,
          category TEXT NOT NULL,
          abv REAL NOT NULL,
          default_volume_ml REAL NOT NULL,
          default_price REAL,
          is_custom INTEGER NOT NULL DEFAULT 0,
          archived INTEGER NOT NULL DEFAULT 0,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS entries (
          id TEXT PRIMARY KEY NOT NULL,
          drink_id TEXT REFERENCES drinks(id) ON DELETE SET NULL,
          name TEXT NOT NULL,
          category TEXT NOT NULL,
          abv REAL NOT NULL,
          volume_ml REAL NOT NULL,
          quantity REAL NOT NULL DEFAULT 1,
          price REAL,
          consumed_at INTEGER NOT NULL,
          note TEXT,
          location TEXT,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_entries_consumed_at ON entries (consumed_at DESC);
        CREATE INDEX IF NOT EXISTS idx_entries_category ON entries (category);
        CREATE INDEX IF NOT EXISTS idx_drinks_category ON drinks (category);

        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY NOT NULL,
          value TEXT NOT NULL
        );
      `);
    }

    if (current < 2) {
      await db.execAsync(`
        -- Single-row table: the CHECK pins every insert to id = 1, so
        -- "INSERT OR REPLACE" always updates the one profile record.
        CREATE TABLE IF NOT EXISTS profile (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          sex TEXT NOT NULL,
          age INTEGER,
          weight_kg REAL,
          height_cm REAL,
          spend_before_tracking_per_day REAL,
          spend_period TEXT NOT NULL,
          reasons TEXT NOT NULL,
          other_reason TEXT,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS tickets (
          id TEXT PRIMARY KEY NOT NULL,
          type TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          screenshot_uri TEXT,
          app_version TEXT NOT NULL,
          platform TEXT NOT NULL,
          status TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets (created_at DESC);
      `);
    }

    await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
  }

  /**
   * Insert catalog drinks that aren't present yet.
   *
   * Existing rows are left alone on purpose: the user may have set a default
   * price or corrected an ABV, and an app update must never overwrite that.
   * New catalog entries in later versions still get picked up.
   */
  private async seedCatalog(db: SQLite.SQLiteDatabase): Promise<void> {
    const seededVersion = await this.readSettingValue(db, 'catalogVersion');
    const alreadySeeded = typeof seededVersion === 'number' && seededVersion >= CATALOG_VERSION;
    if (alreadySeeded) {
      const count = await db.getFirstAsync<{ total: number }>(
        'SELECT COUNT(*) AS total FROM drinks WHERE is_custom = 0'
      );
      if ((count?.total ?? 0) > 0) return;
    }

    const now = Date.now();
    await db.withTransactionAsync(async () => {
      for (const drink of SEED_DRINKS) {
        await db.runAsync(
          `INSERT OR IGNORE INTO drinks
             (id, name, category, abv, default_volume_ml, default_price, is_custom, archived, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, NULL, 0, 0, ?, ?)`,
          [drink.id, drink.name, drink.category, drink.abv, drink.defaultVolumeMl, now, now]
        );
      }
      await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [
        'catalogVersion',
        JSON.stringify(CATALOG_VERSION),
      ]);
    });
  }

  async listDrinks(options?: { includeArchived?: boolean }): Promise<Drink[]> {
    const where = options?.includeArchived ? '' : 'WHERE archived = 0';
    const rows = await this.database.getAllAsync<DrinkRow>(
      `SELECT * FROM drinks ${where} ORDER BY is_custom DESC, name COLLATE NOCASE ASC`
    );
    return rows.map(toDrink);
  }

  async getDrink(id: string): Promise<Drink | null> {
    const row = await this.database.getFirstAsync<DrinkRow>('SELECT * FROM drinks WHERE id = ?', [id]);
    return row ? toDrink(row) : null;
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
    await this.database.runAsync(
      `INSERT INTO drinks
         (id, name, category, abv, default_volume_ml, default_price, is_custom, archived, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, 0, ?, ?)`,
      [
        drink.id,
        drink.name,
        drink.category,
        drink.abv,
        drink.defaultVolumeMl,
        drink.defaultPrice,
        drink.createdAt,
        drink.updatedAt,
      ]
    );
    return drink;
  }

  async updateDrink(
    id: string,
    patch: Partial<DrinkInput> & { archived?: boolean }
  ): Promise<Drink> {
    const existing = await this.getDrink(id);
    if (!existing) throw new Error(`Drink ${id} not found`);

    const next: Drink = {
      ...existing,
      name: patch.name ?? existing.name,
      category: patch.category ?? existing.category,
      abv: patch.abv ?? existing.abv,
      defaultVolumeMl: patch.defaultVolumeMl ?? existing.defaultVolumeMl,
      defaultPrice: patch.defaultPrice === undefined ? existing.defaultPrice : patch.defaultPrice,
      archived: patch.archived ?? existing.archived,
      updatedAt: Date.now(),
    };

    await this.database.runAsync(
      `UPDATE drinks
          SET name = ?, category = ?, abv = ?, default_volume_ml = ?, default_price = ?,
              archived = ?, updated_at = ?
        WHERE id = ?`,
      [
        next.name,
        next.category,
        next.abv,
        next.defaultVolumeMl,
        next.defaultPrice,
        next.archived ? 1 : 0,
        next.updatedAt,
        id,
      ]
    );
    return next;
  }

  async deleteDrink(id: string): Promise<void> {
    // Entries keep their own snapshot of the drink, so history survives; the
    // link is simply cleared.
    await this.database.withTransactionAsync(async () => {
      await this.database.runAsync('UPDATE entries SET drink_id = NULL WHERE drink_id = ?', [id]);
      await this.database.runAsync('DELETE FROM drinks WHERE id = ?', [id]);
    });
  }

  async listEntries(options?: { range?: Range; limit?: number }): Promise<Entry[]> {
    const clauses: string[] = [];
    const params: (string | number)[] = [];

    if (options?.range) {
      clauses.push('consumed_at >= ? AND consumed_at < ?');
      params.push(options.range.start, options.range.end);
    }

    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const limit = options?.limit ? 'LIMIT ?' : '';
    if (options?.limit) params.push(options.limit);

    const rows = await this.database.getAllAsync<EntryRow>(
      `SELECT * FROM entries ${where} ORDER BY consumed_at DESC, created_at DESC ${limit}`,
      params
    );
    return rows.map(toEntry);
  }

  async getEntry(id: string): Promise<Entry | null> {
    const row = await this.database.getFirstAsync<EntryRow>('SELECT * FROM entries WHERE id = ?', [id]);
    return row ? toEntry(row) : null;
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

    await this.database.runAsync(
      `INSERT INTO entries
         (id, drink_id, name, category, abv, volume_ml, quantity, price, consumed_at, note, location, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.id,
        entry.drinkId,
        entry.name,
        entry.category,
        entry.abv,
        entry.volumeMl,
        entry.quantity,
        entry.price,
        entry.consumedAt,
        entry.note,
        entry.location,
        entry.createdAt,
        entry.updatedAt,
      ]
    );
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

    await this.database.runAsync(
      `UPDATE entries
          SET drink_id = ?, name = ?, category = ?, abv = ?, volume_ml = ?, quantity = ?,
              price = ?, consumed_at = ?, note = ?, location = ?, updated_at = ?
        WHERE id = ?`,
      [
        next.drinkId,
        next.name,
        next.category,
        next.abv,
        next.volumeMl,
        next.quantity,
        next.price,
        next.consumedAt,
        next.note,
        next.location,
        next.updatedAt,
        id,
      ]
    );
    return next;
  }

  async deleteEntry(id: string): Promise<void> {
    await this.database.runAsync('DELETE FROM entries WHERE id = ?', [id]);
  }

  private async readSettingValue(db: SQLite.SQLiteDatabase, key: string): Promise<unknown> {
    try {
      const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', [
        key,
      ]);
      return row ? JSON.parse(row.value) : undefined;
    } catch {
      return undefined;
    }
  }

  async getSettings(): Promise<Partial<Settings>> {
    const rows = await this.database.getAllAsync<{ key: string; value: string }>(
      'SELECT key, value FROM settings'
    );
    const settings: Record<string, unknown> = {};
    for (const row of rows) {
      if (!(row.key in DEFAULT_SETTINGS)) continue;
      try {
        settings[row.key] = JSON.parse(row.value);
      } catch {
        // A corrupt value falls back to the default rather than breaking boot.
      }
    }
    return settings as Partial<Settings>;
  }

  async saveSettings(settings: Settings): Promise<void> {
    const entries = Object.entries(settings);
    await this.database.withTransactionAsync(async () => {
      for (const [key, value] of entries) {
        await this.database.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [
          key,
          JSON.stringify(value),
        ]);
      }
    });
  }

  async getProfile(): Promise<Profile | null> {
    const row = await this.database.getFirstAsync<ProfileRow>('SELECT * FROM profile WHERE id = 1');
    return row ? toProfile(row) : null;
  }

  async saveProfile(profile: Profile): Promise<void> {
    await this.database.runAsync(
      `INSERT OR REPLACE INTO profile
         (id, sex, age, weight_kg, height_cm, spend_before_tracking_per_day, spend_period, reasons, other_reason, created_at, updated_at)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        profile.sex,
        profile.age,
        profile.weightKg,
        profile.heightCm,
        profile.spendBeforeTrackingPerDay,
        profile.spendPeriod,
        JSON.stringify(profile.reasons),
        profile.otherReason,
        profile.createdAt,
        profile.updatedAt,
      ]
    );
  }

  async listTickets(): Promise<Ticket[]> {
    // rowid as a secondary key breaks ties deterministically when two tickets
    // share a created_at millisecond.
    const rows = await this.database.getAllAsync<TicketRow>(
      'SELECT * FROM tickets ORDER BY created_at DESC, rowid DESC'
    );
    return rows.map(toTicket);
  }

  async createTicket(input: TicketInput): Promise<Ticket> {
    const now = Date.now();
    const ticket: Ticket = {
      id: newId(),
      type: input.type,
      title: input.title,
      description: input.description,
      screenshotUri: input.screenshotUri ?? null,
      appVersion: input.appVersion,
      platform: input.platform,
      status: 'open',
      createdAt: now,
      updatedAt: now,
    };
    await this.database.runAsync(
      `INSERT INTO tickets
         (id, type, title, description, screenshot_uri, app_version, platform, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ticket.id,
        ticket.type,
        ticket.title,
        ticket.description,
        ticket.screenshotUri,
        ticket.appVersion,
        ticket.platform,
        ticket.status,
        ticket.createdAt,
        ticket.updatedAt,
      ]
    );
    return ticket;
  }

  async updateTicket(id: string, patch: { status: TicketStatus }): Promise<Ticket> {
    const row = await this.database.getFirstAsync<TicketRow>('SELECT * FROM tickets WHERE id = ?', [id]);
    if (!row) throw new Error(`Ticket ${id} not found`);
    const updatedAt = Date.now();
    await this.database.runAsync('UPDATE tickets SET status = ?, updated_at = ? WHERE id = ?', [
      patch.status,
      updatedAt,
      id,
    ]);
    return { ...toTicket(row), status: patch.status, updatedAt };
  }

  async deleteTicket(id: string): Promise<void> {
    await this.database.runAsync('DELETE FROM tickets WHERE id = ?', [id]);
  }

  async clearAll(): Promise<void> {
    await this.database.withTransactionAsync(async () => {
      await this.database.runAsync('DELETE FROM entries');
      await this.database.runAsync('DELETE FROM drinks');
      await this.database.runAsync('DELETE FROM settings');
      await this.database.runAsync('DELETE FROM profile');
      await this.database.runAsync('DELETE FROM tickets');
    });
    await this.seedCatalog(this.database);
  }
}
