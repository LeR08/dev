import { SqliteStore } from './sqlite';
import type { Store } from './store';

export { newId } from './store';
export type { Backup, Store } from './store';

let instance: Store | null = null;

/**
 * The app's single store instance — SQLite on iOS and Android.
 *
 * The browser gets `index.web.ts` instead, which resolves to a
 * localStorage-backed store. Metro picks the platform variant, so the web
 * bundle never pulls in expo-sqlite's WASM build (which needs cross-origin
 * isolation headers a plain static host does not set). Both satisfy the same
 * `Store` contract, so nothing above this module has to care which is live.
 */
export function getStore(): Store {
  if (!instance) {
    instance = new SqliteStore();
  }
  return instance;
}

/** Test seam: swap in a store (or reset between test cases). */
export function setStore(store: Store | null): void {
  instance = store;
}
