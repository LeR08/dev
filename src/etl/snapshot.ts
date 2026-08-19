import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { VenueSnapshot } from '@/lib/types';
import type { PendingVenue, Venue } from '@/lib/types';

export const DATA_DIR = path.join(process.cwd(), 'data');
export const SNAPSHOT_PATH = path.join(DATA_DIR, 'venues.json');
export const PENDING_PATH = path.join(DATA_DIR, 'pending-venues.json');
export const STATE_PATH = path.join(DATA_DIR, 'etl-state.json');
export const RUNS_PATH = path.join(DATA_DIR, 'etl-runs.json');
export const OVERRIDES_PATH = path.join(DATA_DIR, 'overrides.json');

/** Per-venue manual corrections; §10 requires these to survive every ETL run. */
export type Overrides = Record<string, Partial<Venue> & { override_fields?: string[] }>;

export interface EtlState {
  /** Consecutive runs a venue has been absent from a valid licence list. */
  missingRuns: Record<string, number>;
  lastVenueCount: number;
  /** Rows the last *trusted* Overpass response returned, for the same check. */
  lastOsmCount?: number;
}

export interface EtlRun {
  id: string;
  source: string;
  started_at: string;
  finished_at: string;
  inserted: number;
  updated: number;
  unchanged: number;
  closed: number;
  pending: number;
  errors: string[];
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(file, 'utf8')) as T;
  } catch {
    return fallback;
  }
}

export async function readSnapshot(): Promise<VenueSnapshot | null> {
  const raw = await readJson<unknown>(SNAPSHOT_PATH, null);
  if (raw == null) return null;
  const parsed = VenueSnapshot.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export const readState = () =>
  readJson<EtlState>(STATE_PATH, { missingRuns: {}, lastVenueCount: 0, lastOsmCount: 0 });
export const readOverrides = () => readJson<Overrides>(OVERRIDES_PATH, {});
export const readRuns = () => readJson<EtlRun[]>(RUNS_PATH, []);

async function writeJson(file: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export const writeSnapshot = (snapshot: VenueSnapshot) => writeJson(SNAPSHOT_PATH, snapshot);
export const writePending = (pending: PendingVenue[]) => writeJson(PENDING_PATH, pending);
export const writeState = (state: EtlState) => writeJson(STATE_PATH, state);
export const writeOverrides = (overrides: Overrides) => writeJson(OVERRIDES_PATH, overrides);

/** Keeps the last 50 runs; the admin ETL log in M5 reads this file. */
export async function appendRun(run: EtlRun): Promise<void> {
  const runs = await readRuns();
  await writeJson(RUNS_PATH, [run, ...runs].slice(0, 50));
}
