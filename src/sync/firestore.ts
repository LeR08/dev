import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  writeBatch,
} from 'firebase/firestore';

import type { Drink, Entry, Profile } from '@/domain/types';
import type { RemoteRecord } from '@/domain/sync';
import { getFirebaseFirestore } from './firestoreInstance';
import type { SyncOp } from './types';

/**
 * Firestore layout: `users/{uid}` holds the profile fields directly (it's a
 * singleton, same shape the local store already uses), with `entries` and
 * `drinks` as subcollections keyed by the same ids SQLite/localStorage
 * already assign. See firestore.rules for the access-control side of this —
 * everything here assumes those rules are the real enforcement, not this
 * client code.
 */
function userDoc(uid: string) {
  return doc(getFirebaseFirestore(), 'users', uid);
}

function entryDoc(uid: string, id: string) {
  return doc(getFirebaseFirestore(), 'users', uid, 'entries', id);
}

function drinkDoc(uid: string, id: string) {
  return doc(getFirebaseFirestore(), 'users', uid, 'drinks', id);
}

/**
 * Pushes queued ops to Firestore and returns the ones that made it, so the
 * caller can drain exactly those from the local outbox (see src/sync/outbox.ts)
 * — anything that fails (offline, permissions) is left queued for next time.
 */
export async function pushOps(uid: string, ops: SyncOp[]): Promise<SyncOp[]> {
  const pushed: SyncOp[] = [];
  for (const op of ops) {
    try {
      if (op.collection === 'profile') {
        await setDoc(userDoc(uid), { ...op.payload, deleted: false }, { merge: true });
      } else {
        const ref = op.collection === 'entries' ? entryDoc(uid, op.recordId) : drinkDoc(uid, op.recordId);
        if (op.type === 'delete') {
          // A tombstone, not a real delete — another device needs to see
          // "this was removed" on its next pull, not just find nothing and
          // assume it never synced. deleteAllUserData (account deletion) is
          // the one place a real Firestore delete happens.
          await setDoc(ref, { deleted: true, deletedAt: op.timestamp, updatedAt: op.timestamp }, { merge: true });
        } else {
          await setDoc(ref, { ...op.payload, deleted: false });
        }
      }
      pushed.push(op);
    } catch {
      // Left in the outbox; the next sync pass retries it.
    }
  }
  return pushed;
}

export async function pullEntries(uid: string): Promise<RemoteRecord<Entry>[]> {
  const snapshot = await getDocs(collection(getFirebaseFirestore(), 'users', uid, 'entries'));
  return snapshot.docs.map((docSnap) => docSnap.data() as RemoteRecord<Entry>);
}

export async function pullDrinks(uid: string): Promise<RemoteRecord<Drink>[]> {
  const snapshot = await getDocs(collection(getFirebaseFirestore(), 'users', uid, 'drinks'));
  return snapshot.docs.map((docSnap) => docSnap.data() as RemoteRecord<Drink>);
}

export async function pullProfile(uid: string): Promise<Profile | null> {
  const snapshot = await getDoc(userDoc(uid));
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  if (data.deleted) return null;
  return data as Profile;
}

/**
 * True erasure for "Delete my account" (GDPR right to erasure) — every
 * document this account ever wrote, not just the top-level profile doc.
 * Client-side batched deletes are fine at this app's personal scale (a few
 * thousand rows at most, same ceiling noted for the in-memory local store);
 * a Cloud Function would only be needed for collections too large for one
 * client to enumerate.
 */
export async function deleteAllUserData(uid: string): Promise<void> {
  const firestore = getFirebaseFirestore();
  const [entriesSnapshot, drinksSnapshot] = await Promise.all([
    getDocs(collection(firestore, 'users', uid, 'entries')),
    getDocs(collection(firestore, 'users', uid, 'drinks')),
  ]);

  const allDocs = [...entriesSnapshot.docs, ...drinksSnapshot.docs];
  const BATCH_LIMIT = 500; // Firestore's own per-batch write limit.
  for (let i = 0; i < allDocs.length; i += BATCH_LIMIT) {
    const batch = writeBatch(firestore);
    for (const docSnap of allDocs.slice(i, i + BATCH_LIMIT)) {
      batch.delete(docSnap.ref);
    }
    await batch.commit();
  }

  await deleteDoc(userDoc(uid));
}
