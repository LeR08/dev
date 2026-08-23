import { mergeById, mergeLatest } from '@/domain/sync';
import type { Drink, Entry, Profile } from '@/domain/types';
import { pullDrinks, pullEntries, pullProfile, pushOps } from './firestore';
import { clearOutbox, enqueueOp, listOutbox, removeOps } from './outbox';
import type { SyncOp } from './types';

const DEBOUNCE_MS = 3000;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

/** Queues a push a few seconds out rather than on every keystroke-adjacent write, per spec v2.0 §3. */
export function scheduleDebouncedPush(uid: string, onFlush: () => void): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void drainOutbox(uid).then(onFlush);
  }, DEBOUNCE_MS);
}

export function cancelScheduledPush(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
}

export async function drainOutbox(uid: string): Promise<void> {
  const ops = await listOutbox();
  if (ops.length === 0) return;
  const pushed = await pushOps(uid, ops);
  await removeOps(pushed);
}

export type LocalSnapshot = {
  entries: Entry[];
  drinks: Drink[];
  profile: Profile | null;
};

export type SyncResult = {
  entries: Entry[];
  drinks: Drink[];
  profile: Profile | null;
};

/**
 * One full sync pass: push whatever's queued, pull the cloud copy, merge it
 * into the given local snapshot, and return the merged result — the caller
 * (AppProvider) is the one that actually owns app state, this just computes
 * what the new state should be. Safe to call as often as needed: pull-to-refresh,
 * app foreground, and right after sign-in all just call this.
 */
export async function syncNow(uid: string, local: LocalSnapshot): Promise<SyncResult> {
  await drainOutbox(uid);

  const [remoteEntries, remoteDrinks, remoteProfile] = await Promise.all([
    pullEntries(uid),
    pullDrinks(uid),
    pullProfile(uid),
  ]);

  // A write still sitting in the outbox (its push failed — offline, most
  // likely) must not be clobbered by this same pull: its updatedAt could
  // still predate a stale server copy from before this device went offline.
  // This device's own not-yet-pushed writes always win over what a pull
  // brings back for the same id.
  const pending = await listOutbox();
  const pendingKeys = new Set(pending.map((op) => `${op.collection}:${op.recordId}`));

  const entries = mergeById(
    local.entries,
    remoteEntries.filter((entry) => !pendingKeys.has(`entries:${entry.id}`))
  );
  const drinks = mergeById(
    local.drinks,
    remoteDrinks.filter((drink) => !pendingKeys.has(`drinks:${drink.id}`))
  );
  const profile = pendingKeys.has('profile:profile') ? local.profile : mergeLatest(local.profile, remoteProfile);

  return { entries, drinks, profile };
}

/**
 * Runs once right after sign-in, before the first syncNow(): queues this
 * device's entire current local state as pending upserts, so pre-existing
 * local-only data is never discarded (spec v2.0 §3's "first sign-in
 * migration") — including on a brand new account with an empty cloud, where
 * this local state simply becomes the initial cloud state once pushed.
 */
export async function migrateLocalDataOnSignIn(local: LocalSnapshot): Promise<void> {
  const ops: SyncOp[] = [
    ...local.entries.map(
      (entry): SyncOp => ({ collection: 'entries', recordId: entry.id, type: 'upsert', payload: entry, timestamp: entry.updatedAt })
    ),
    ...local.drinks
      .filter((drink) => drink.isCustom)
      .map(
        (drink): SyncOp => ({ collection: 'drinks', recordId: drink.id, type: 'upsert', payload: drink, timestamp: drink.updatedAt })
      ),
    ...(local.profile
      ? [{ collection: 'profile', recordId: 'profile', type: 'upsert', payload: local.profile, timestamp: local.profile.updatedAt } as SyncOp]
      : []),
  ];
  for (const op of ops) {
    await enqueueOp(op);
  }
}

/** Called on sign-out so a different account signing in later on this device starts clean. */
export async function resetSyncStateOnSignOut(): Promise<void> {
  cancelScheduledPush();
  await clearOutbox();
}
