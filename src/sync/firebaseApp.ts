import { type FirebaseApp, getApps, initializeApp } from 'firebase/app';
import { Platform } from 'react-native';

/**
 * Firebase web/config values — these are NOT secret (unlike the Stripe/PayPal
 * keys in server/): a Firebase client config is meant to be embedded in the
 * shipped app. Real access control comes from Firestore security rules
 * (see firestore.rules) and Firebase Auth, not from hiding this object.
 * Ships with placeholder values — see README's "Accounts & cloud sync"
 * section for how to create your own Firebase project and fill these in.
 */
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
};

export function isFirebaseConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
}

/**
 * On web, Google sign-in goes through `signInWithPopup` straight against the
 * Firebase project above — no separate OAuth client id needed. On native
 * there's no popup API, so it goes through expo-auth-session instead (see
 * app/settings/account.tsx), whose `useIdTokenAuthRequest` throws synchronously
 * (crashing the screen that renders it) unless it's given a client id for the
 * *current* platform specifically — the web client id alone isn't enough on
 * Android or iOS. Until the platform-specific one is set, the native Google
 * button shows a clear "not set up" state rather than a broken one.
 */
export function isGoogleSignInAvailable(): boolean {
  if (!isFirebaseConfigured()) return false;
  if (Platform.OS === 'web') return true;
  if (Platform.OS === 'android') return Boolean(process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID);
  if (Platform.OS === 'ios') return Boolean(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID);
  return false;
}

let app: FirebaseApp | null = null;

/** Lazily initialised so importing this module is always safe, even with no config yet. */
export function getFirebaseApp(): FirebaseApp {
  if (!isFirebaseConfigured()) {
    throw new Error(
      'Firebase is not configured. Copy .env.example to .env and fill in your own Firebase project config (EXPO_PUBLIC_FIREBASE_*).'
    );
  }
  if (!app) {
    app = getApps()[0] ?? initializeApp(firebaseConfig);
  }
  return app;
}
