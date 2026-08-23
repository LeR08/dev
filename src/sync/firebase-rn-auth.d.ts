// @firebase/auth's own package.json "exports" map declares getReactNativePersistence
// under its "react-native" condition (./dist/rn/index.rn.d.ts) — the one Metro
// resolves at bundle time — but a sibling top-level "types" entry shadows it for
// TypeScript's own resolution, which only sees the platform-agnostic typings.
// This augments the module with the one export that's genuinely missing there.
import type { Persistence } from 'firebase/auth';

declare module '@firebase/auth' {
  export function getReactNativePersistence(storage: unknown): Persistence;
}
