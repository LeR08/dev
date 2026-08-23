/**
 * Pure conflict-resolution logic for cloud sync (spec v2.0 §3). Kept free of
 * any Firebase/network dependency so the merge rules can be tested in
 * isolation and never drift from what src/sync actually does at runtime.
 *
 * Two different rules for two different kinds of data:
 *  - Entries and drinks are an append-mostly log: merge by id (mergeById),
 *    additive rather than whole-collection last-write-wins, so an entry
 *    added on the phone while offline and a different one added on the web
 *    session both survive the next sync instead of one clobbering the other.
 *  - The profile is a single record that does get edited in place: plain
 *    last-write-wins by timestamp (mergeLatest) is enough since conflicts
 *    there are rare and low-stakes.
 */

export type SyncableRecord = { id: string; updatedAt: number };

/** What a pulled Firestore snapshot looks like: same shape, plus an optional tombstone. */
export type RemoteRecord<T extends SyncableRecord> = T & { deleted?: boolean };

/**
 * Merges a local collection with a remote snapshot, keyed by id:
 *  - A remote id not present locally is added (the additive case).
 *  - A remote id present in both keeps whichever side has the newer
 *    `updatedAt` — this is what "conflict resolution" means here, so a
 *    stale pull can never quietly overwrite a newer local edit.
 *  - A remote tombstone (`deleted: true`) removes that id locally,
 *    regardless of its updatedAt — deletions always propagate. (A local
 *    delete not yet pushed is handled one layer up, by the sync engine
 *    excluding ids still in the outbox from being overwritten by a pull.)
 */
export function mergeById<T extends SyncableRecord>(local: T[], remote: RemoteRecord<T>[]): T[] {
  const byId = new Map<string, T>();
  for (const item of local) byId.set(item.id, item);

  for (const item of remote) {
    if (item.deleted) {
      byId.delete(item.id);
      continue;
    }
    const existing = byId.get(item.id);
    if (!existing || item.updatedAt > existing.updatedAt) {
      const { deleted: _deleted, ...record } = item;
      byId.set(item.id, record as T);
    }
  }

  return [...byId.values()];
}

export type Updatable = { updatedAt: number };

/** Last-write-wins for a singleton record (the profile) by timestamp. */
export function mergeLatest<T extends Updatable>(local: T | null, remote: T | null): T | null {
  if (!remote) return local;
  if (!local) return remote;
  return remote.updatedAt > local.updatedAt ? remote : local;
}
