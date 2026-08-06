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
