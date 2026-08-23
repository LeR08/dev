import type { Store } from './store';
import { WebStore } from './web';

export { newId } from './store';
export type { Backup, Store } from './store';

let instance: Store | null = null;

/**
 * Browser build of {@link getStore}, resolved by Metro in place of `index.ts`.
 *
 * Keeping the SQLite import out of this file is the point: expo-sqlite's web
 * backend ships a WASM worker that needs COOP/COEP headers for persistent
 * storage, which a static PWA host will not have.
 */
export function getStore(): Store {
  if (!instance) {
    instance = new WebStore();
  }
  return instance;
}

/** Test seam: swap in a store (or reset between test cases). */
export function setStore(store: Store | null): void {
  instance = store;
}
