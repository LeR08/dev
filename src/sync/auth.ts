import {
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  GoogleAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';

import { getFirebaseAuth } from './authInstance';
import { deleteAllUserData } from './firestore';

export type { User } from 'firebase/auth';

export function onAuthChange(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(getFirebaseAuth(), callback);
}

export function currentUser(): User | null {
  return getFirebaseAuth().currentUser;
}

export async function signUpWithEmail(email: string, password: string): Promise<User> {
  const credential = await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
  return credential.user;
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  const credential = await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
  return credential.user;
}

export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(getFirebaseAuth(), email);
}

/** Web only — opens Google's own account picker in a popup. Never called on native (see signInWithGoogleIdToken). */
export async function signInWithGooglePopup(): Promise<User> {
  const credential = await signInWithPopup(getFirebaseAuth(), new GoogleAuthProvider());
  return credential.user;
}

/**
 * Native path: the id token comes from expo-auth-session's own Google OAuth
 * flow (see app/settings/account.tsx) — `signInWithPopup` has no RN
 * equivalent, so this exchanges that token for a Firebase session instead.
 */
export async function signInWithGoogleIdToken(idToken: string): Promise<User> {
  const result = await signInWithCredential(getFirebaseAuth(), GoogleAuthProvider.credential(idToken));
  return result.user;
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(getFirebaseAuth());
}

/**
 * True erasure, not just a local sign-out — GDPR's "right to erasure" is
 * exactly why this exists: deletes every document this account wrote to
 * Firestore, then the Firebase Auth user itself. If neither of those
 * survives even a crash partway through, retrying is safe: deleting
 * already-deleted Firestore docs is a no-op, and Firebase disallows a
 * duplicate account under the same email once the auth user is really gone.
 */
export async function deleteAccount(password: string): Promise<void> {
  const user = currentUser();
  if (!user) throw new Error('No signed-in account to delete.');
  if (!user.email) throw new Error('This account has no email to reauthenticate with.');

  // Firebase requires a *recent* sign-in for account deletion; re-authenticating
  // here (rather than only reacting to the "requires-recent-login" error) means
  // the confirmation dialog always has the password field it needs up front.
  await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));

  await deleteAllUserData(user.uid);
  await deleteUser(user);
}
