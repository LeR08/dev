import { type Auth, getAuth } from 'firebase/auth';

import { getFirebaseApp } from './firebaseApp';

/** Web half of the platform split — the browser build persists sessions to localStorage on its own. */
let auth: Auth | null = null;

export function getFirebaseAuth(): Auth {
  if (!auth) {
    auth = getAuth(getFirebaseApp());
  }
  return auth;
}
