import AsyncStorage from '@react-native-async-storage/async-storage';

import type { SyncOp } from './types';

/**
 * The local queue of not-yet-pushed writes (spec v2.0 §3's "sync on
 * foreground/launch/pull-to-refresh/after any local write, debounced").
 * Deliberately outside the Store contract (src/db/store.ts): it's a concern
 * of the sync layer alone, not of local-first storage, so it doesn't need a
 * SQLite migration or a second implementation for every existing Store
 * consumer/test. Native half of the platform split — see outbox.web.ts for
 * the browser half, same convention as src/db/index.ts / index.web.ts.
 */
const KEY = 'tally.syncOutbox';

export async function listOutbox(): Promise<SyncOp[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SyncOp[]) : [];
  } catch {
    return [];
  }
}

async function writeOutbox(ops: SyncOp[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(ops));
}

/**
 * Appends a pending op, collapsing any earlier pending op for the same
 * record — only the latest state needs pushing, so three offline edits to
 * the same entry become one write once connectivity comes back.
 */
export async function enqueueOp(op: SyncOp): Promise<void> {
  const current = await listOutbox();
  const withoutThisRecord = current.filter(
    (existing) => !(existing.collection === op.collection && existing.recordId === op.recordId)
  );
  await writeOutbox([...withoutThisRecord, op]);
}

/** Removes ops once they've been confirmed pushed to Firestore. */
export async function removeOps(pushed: SyncOp[]): Promise<void> {
  if (pushed.length === 0) return;
  const current = await listOutbox();
  const pushedKeys = new Set(pushed.map((op) => `${op.collection}:${op.recordId}:${op.timestamp}`));
  await writeOutbox(current.filter((op) => !pushedKeys.has(`${op.collection}:${op.recordId}:${op.timestamp}`)));
}

export async function clearOutbox(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
