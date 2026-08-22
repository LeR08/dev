import {
  GoogleSignin,
  isCancelledResponse,
  isSuccessResponse,
  statusCodes,
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
  /**
   * Translated fallback for anything the SDK reports that we do not map.
   *
   * This must not be the app's all-purpose "check your connection" string.
   * The commonest cause of a failure here is a signing certificate Google
   * does not recognise — a build installed from Play is signed with Play's
   * app signing key, not the upload key, and that fingerprint has to be
   * registered separately. Telling someone to check their connection sends
   * them to look at the one thing that is working.
   */
  genericErrorMessage: string;
  /** Shown when Google Play services are missing or too old to be used. */
  playServicesErrorMessage: string;
  /** Called before the flow starts, e.g. to clear a pending sign-out guard. */
  onBeforeSignIn?: () => void;
};

export function GoogleSignInButton({
  label,
  webClientId,
  onError,
  genericErrorMessage,
  playServicesErrorMessage,
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
    } catch (cause) {
      const code =
        cause && typeof cause === 'object' && 'code' in cause
          ? String((cause as { code?: unknown }).code)
          : '';
      if (code === statusCodes.IN_PROGRESS) return;
      if (code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        onError(playServicesErrorMessage);
        return;
      }
      // The code goes on screen deliberately. Google's SDK distinguishes a
      // dozen failures — an unregistered signing certificate, a consent
      // screen still in testing, a revoked client — and every one of them
      // reaches the user as the same sentence. Without the code there is
      // nothing to act on, for them or for whoever reads their bug report.
      onError(code ? `${genericErrorMessage} (${code})` : genericErrorMessage);
    } finally {
      setBusy(false);
    }
  };

  return <Button label={label} variant="secondary" loading={busy} onPress={() => void signIn()} />;
}
