import AsyncStorage from '@react-native-async-storage/async-storage';
// The top-level `firebase/auth` package has no "react-native" export
// condition of its own, so importing from it resolves to the same browser
// build on native as on web — which would silently fall back to in-memory
// persistence (a signed-in session wouldn't survive an app restart).
// `@firebase/auth` (the package `firebase` re-exports) does declare a
// "react-native" condition with the AsyncStorage-backed persistence helper,
// so that's imported directly here, in the native-only half of this
// platform split (see authInstance.web.ts for the browser half).
// eslint-disable-next-line @typescript-eslint/no-var-requires
import { type Auth, getReactNativePersistence, initializeAuth } from '@firebase/auth';

import { getFirebaseApp } from './firebaseApp';

let auth: Auth | null = null;

export function getFirebaseAuth(): Auth {
  if (!auth) {
    auth = initializeAuth(getFirebaseApp(), {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  }
  return auth;
}

/**
 * Recovery path for a session stuck in a bad local state — observed on a
 * real device where `signOut()` itself never resolved or rejected, which
 * left it permanently "signed in" locally with no way out through normal
 * auth calls (all of which go through this same persistence layer and hung
 * the same way). Firebase's RN persistence writes its session under keys
 * prefixed `firebase:` (`firebase:authUser:...`, etc.) — removing them
 * directly bypasses whatever is stuck and forces a clean slate; they're
 * reconstructed fresh on the next real sign-in, so this is always safe.
 */
export async function clearPersistedAuthSession(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const authKeys = keys.filter((key) => key.startsWith('firebase:'));
  if (authKeys.length > 0) await AsyncStorage.multiRemove(authKeys);
}
