import type { Drink, Entry, Profile } from '@/domain/types';

export type SyncCollection = 'entries' | 'drinks' | 'profile';

export type SyncPayload = Entry | Drink | Profile;

/** A pending local write, queued until it can be pushed to Firestore. */
export type SyncOp = {
  collection: SyncCollection;
  /** The entry/drink id, or the literal 'profile' for the singleton profile record. */
  recordId: string;
  type: 'upsert' | 'delete';
  /** Null for deletes — nothing to write but the tombstone itself. */
  payload: SyncPayload | null;
  timestamp: number;
};
