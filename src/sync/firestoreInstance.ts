import { type Firestore, getFirestore } from 'firebase/firestore';

import { getFirebaseApp } from './firebaseApp';

/**
 * Firestore's JS SDK works the same way on web and native — no platform
 * split needed here (unlike Auth, which needs different session-persistence
 * backends per platform; see authInstance.ts / authInstance.web.ts).
 *
 * Firestore's own offline cache is deliberately left at its default
 * (memory-only, not IndexedDB persistence) — this app already has a real
 * offline-first store in SQLite/localStorage plus its own sync outbox
 * (src/sync/outbox.ts); layering Firestore's own persistence on top would
 * just be a second, redundant offline cache to keep consistent with the first.
 */
let firestore: Firestore | null = null;

export function getFirebaseFirestore(): Firestore {
  if (!firestore) {
    firestore = getFirestore(getFirebaseApp());
  }
  return firestore;
}
