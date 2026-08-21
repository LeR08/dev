import {
  GoogleSignin,
  isCancelledResponse,
  isSuccessResponse,
} from '@react-native-google-signin/google-signin';
import React, { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { signInWithGoogleIdToken } from '@/sync/auth';

/**
 * Google sign-in on Android/iOS, through Google's own native SDK.
 *
 * This replaced an expo-auth-session browser flow, which stopped working for
 * three separate reasons at once:
 *
 *  - Google now creates Android OAuth clients with custom URI schemes
 *    disabled, and that flow is built on one ("Custom URI scheme is not
 *    enabled for your Android client"). The toggle that re-enables it is
 *    being phased out.
 *  - Google returned an authorization `code` rather than an `id_token`, which
 *    `useIdTokenAuthRequest` cannot exchange — so sign-in would have failed
 *    even once the redirect worked.
 *  - The redirect landed on expo-router as an unmatched route instead of
 *    being consumed by expo-auth-session.
 *
 * The native SDK has none of that: no browser, no redirect, no custom scheme.
 * It was originally avoided only because it does not run in Expo Go — a
 * constraint that stopped applying when this project moved to development
 * builds.
 *
 * `webClientId` is deliberately the *web* client id, not the Android one:
 * that is what Google's SDK requires to hand back an `idToken`, which is in
 * turn what Firebase needs. The Android client still has to exist and carry
 * the right SHA-1 fingerprints, but its id is never passed here.
 */

let configured = false;

/** Configuring twice is harmless but pointless; the id never changes at runtime. */
function ensureConfigured(webClientId: string) {
  if (configured) return;
  GoogleSignin.configure({ webClientId });
  configured = true;
}

export type GoogleSignInButtonProps = {
  label: string;
  webClientId: string;
  onError: (message: string) => void;
  /** Translated fallback for anything the SDK reports that we do not map. */
  genericErrorMessage: string;
  /** Called before the flow starts, e.g. to clear a pending sign-out guard. */
  onBeforeSignIn?: () => void;
};

export function GoogleSignInButton({
  label,
  webClientId,
  onError,
  genericErrorMessage,
  onBeforeSignIn,
}: GoogleSignInButtonProps) {
  const [busy, setBusy] = useState(false);

  const signIn = async () => {
    onError('');
    onBeforeSignIn?.();
    setBusy(true);
    try {
      ensureConfigured(webClientId);
      // Android only: surfaces a recoverable dialog when Play Services are
      // missing or out of date, rather than failing with an opaque error.
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      const response = await GoogleSignin.signIn();
      if (isCancelledResponse(response)) return;
      if (!isSuccessResponse(response) || !response.data.idToken) {
        onError(genericErrorMessage);
        return;
      }
      await signInWithGoogleIdToken(response.data.idToken);
    } catch {
      onError(genericErrorMessage);
    } finally {
      setBusy(false);
    }
  };

  return <Button label={label} variant="secondary" loading={busy} onPress={() => void signIn()} />;
}
