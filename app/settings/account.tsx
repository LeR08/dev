import React, { useState } from 'react';
import { Alert, Platform, View } from 'react-native';

import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { formatDateTime } from '@/domain/format';
import { useTranslation } from '@/i18n/I18nProvider';
import {
  deleteAccount,
  sendPasswordReset,
  signInWithEmail,
  signInWithGooglePopup,
  signOut,
  signUpWithEmail,
} from '@/sync/auth';
import { clearPersistedAuthSession } from '@/sync/authInstance';
import { isFirebaseConfigured, isGoogleSignInAvailable } from '@/sync/firebaseApp';
import { useApp } from '@/state/AppProvider';
import { useTheme } from '@/theme/ThemeProvider';

const DELETE_CONFIRM_WORD = 'DELETE';

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';

// A corrupted local persistence layer (e.g. from an earlier native-module
// mismatch — see git history) can make Firebase's own signOut() hang rather
// than reject, the same failure mode already worked around for sync in
// AppProvider.tsx. Bounded here the same way, so "Sign out" can never leave
// someone stuck on this screen with no feedback and no way out.
const SIGN_OUT_TIMEOUT_MS = 8000;
function withTimeout<T>(promise: Promise<T>, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_resolve, reject) => {
      setTimeout(() => reject(new Error(message)), SIGN_OUT_TIMEOUT_MS);
    }),
  ]);
}

function describeAuthError(cause: unknown, t: ReturnType<typeof useTranslation>['t']): string {
  const code = cause && typeof cause === 'object' && 'code' in cause ? String((cause as { code?: unknown }).code) : '';
  switch (code) {
    case 'auth/invalid-email':
      return t('account.errorInvalidEmail');
    case 'auth/email-already-in-use':
      return t('account.errorEmailInUse');
    case 'auth/weak-password':
      return t('account.errorWeakPassword');
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return t('account.errorWrongPassword');
    case 'auth/user-not-found':
      return t('account.errorUserNotFound');
    case 'auth/too-many-requests':
      return t('account.errorTooManyRequests');
    default:
      return t('account.errorGeneric');
  }
}


/**
 * Firebase Auth is the real source of truth for sign-in state; this screen
 * only reads `settings.account`, the bookkeeping AppProvider's onAuthChange
 * listener keeps in sync with it (see src/state/AppProvider.tsx) — that
 * listener is also what actually runs the post-sign-in migration and sync
 * passes, so this screen's job is just to call the auth actions and show
 * where things stand.
 */
export default function AccountScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { settings, syncing, syncNow, forceLocalSignOut, clearSignOutSuppression } = useApp();
  const toast = useToast();

  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<'auth' | 'reset' | 'signOut' | 'delete' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [confirmText, setConfirmText] = useState('');

  const account = settings.account;
  const configured = isFirebaseConfigured();
  const googleAvailable = isGoogleSignInAvailable();

  const submitAuth = async () => {
    setBusy('auth');
    setErrorMessage(null);
    clearSignOutSuppression();
    try {
      if (mode === 'signUp') {
        await signUpWithEmail(email.trim(), password);
      } else {
        await signInWithEmail(email.trim(), password);
      }
      setPassword('');
    } catch (cause) {
      setErrorMessage(describeAuthError(cause, t));
    } finally {
      setBusy(null);
    }
  };

  const submitGoogleWeb = async () => {
    setBusy('auth');
    setErrorMessage(null);
    clearSignOutSuppression();
    try {
      await signInWithGooglePopup();
    } catch (cause) {
      setErrorMessage(describeAuthError(cause, t));
    } finally {
      setBusy(null);
    }
  };

  const submitReset = async () => {
    if (!email.trim()) return;
    setBusy('reset');
    setErrorMessage(null);
    try {
      await sendPasswordReset(email.trim());
      toast.show({ message: t('account.resetSentToast') });
    } catch {
      setErrorMessage(t('account.resetFailedToast'));
    } finally {
      setBusy(null);
    }
  };

  const doSignOut = async () => {
    setBusy('signOut');
    setErrorMessage(null);
    try {
      await withTimeout(signOut(), 'Sign out timed out');
    } catch (cause) {
      // Firebase's own signOut() failing/hanging shouldn't trap someone on
      // this screen forever. Two layers here: forceLocalSignOut() tells
      // AppProvider's auth listener to stop re-asserting "signed in" for
      // this exact uid even though Firebase's in-memory session was never
      // actually cleared (that's the *live* fix); clearPersistedAuthSession()
      // wipes Firebase's own on-disk session too, so a later app restart
      // doesn't resurrect it either. Both are safe — a real session is
      // reconstructed fresh on the next successful sign-in.
      await forceLocalSignOut();
      await clearPersistedAuthSession();
      setErrorMessage(describeAuthError(cause, t));
    } finally {
      setBusy(null);
    }
  };

  const confirmSignOut = () => {
    if (Platform.OS === 'web') {
      void doSignOut();
      return;
    }
    Alert.alert(t('account.signOutConfirmTitle'), t('account.signOutConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('account.signOutAction'), onPress: () => void doSignOut() },
    ]);
  };

  const canDelete = confirmText.trim().toUpperCase() === DELETE_CONFIRM_WORD && deletePassword.length > 0;

  const runDelete = async () => {
    setBusy('delete');
    setErrorMessage(null);
    try {
      await withTimeout(deleteAccount(deletePassword), 'Delete account timed out');
      setDeletePassword('');
      setConfirmText('');
      toast.show({ message: t('account.deletedToast') });
    } catch (cause) {
      setErrorMessage(describeAuthError(cause, t));
    } finally {
      setBusy(null);
    }
  };

  const confirmDelete = () => {
    if (!canDelete) return;
    if (Platform.OS === 'web') {
      void runDelete();
      return;
    }
    Alert.alert(t('account.deleteConfirmTitle'), t('account.deleteConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('account.deleteAction'), style: 'destructive', onPress: () => void runDelete() },
    ]);
  };

  if (!configured) {
    return (
      <Screen>
        <View style={{ gap: theme.spacing(4), paddingTop: theme.spacing(4) }}>
          <Card tone="muted" style={{ gap: theme.spacing(2) }}>
            <Text variant="heading">{t('account.notConfiguredTitle')}</Text>
            <Text variant="body" tone="muted">
              {t('account.notConfiguredBody')}
            </Text>
          </Card>
        </View>
      </Screen>
    );
  }

  if (account) {
    return (
      <Screen>
        <View style={{ gap: theme.spacing(4), paddingTop: theme.spacing(4) }}>
          <Card tone="accent" style={{ gap: theme.spacing(1) }}>
            <Text variant="heading">{t('account.signedInAs', { email: account.email ?? '' })}</Text>
            <Text variant="caption" tone="muted">
              {syncing
                ? t('account.syncingLabel')
                : account.lastSyncedAt
                  ? t('account.lastSyncedLabel', { date: formatDateTime(account.lastSyncedAt) })
                  : t('account.neverSyncedLabel')}
            </Text>
          </Card>

          {errorMessage ? (
            <Card tone="muted" style={{ gap: theme.spacing(1) }}>
              <Text variant="body" tone="muted">
                {errorMessage}
              </Text>
            </Card>
          ) : null}

          <Button
            label={t('account.syncNowAction')}
            variant="secondary"
            loading={syncing}
            onPress={() => void syncNow()}
          />

          <Button
            label={t('account.signOutAction')}
            variant="ghost"
            haptic={false}
            loading={busy === 'signOut'}
            onPress={confirmSignOut}
          />

          <Card style={{ gap: theme.spacing(3) }}>
            <View style={{ gap: theme.spacing(1) }}>
              <Text variant="heading">{t('account.deleteTitle')}</Text>
              <Text variant="body" tone="muted">
                {t('account.deleteBody')}
              </Text>
            </View>
            {errorMessage ? (
              <Text variant="caption" tone="accent">
                {errorMessage}
              </Text>
            ) : null}
            <Field
              label={t('account.passwordConfirmLabel')}
              value={deletePassword}
              onChangeText={setDeletePassword}
              secureTextEntry
              autoCapitalize="none"
            />
            <Field
              label={t('dataScreen.confirmLabel', { word: DELETE_CONFIRM_WORD })}
              value={confirmText}
              onChangeText={setConfirmText}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder={DELETE_CONFIRM_WORD}
            />
            <Button
              label={t('account.deleteAction')}
              variant="destructive"
              disabled={!canDelete}
              loading={busy === 'delete'}
              haptic={false}
              onPress={confirmDelete}
            />
          </Card>
        </View>
      </Screen>
    );
  }

  return (
    <Screen bottomInset={theme.spacing(6)}>
      <View style={{ gap: theme.spacing(5), paddingTop: theme.spacing(4) }}>
        <Card tone="muted" style={{ gap: theme.spacing(1) }}>
          <Text variant="body" tone="muted">
            {t('account.localOnlyIntro')}
          </Text>
        </Card>

        <Card style={{ gap: theme.spacing(1) }}>
          <Text variant="label">{t('account.whatIsStoredTitle')}</Text>
          <Text variant="caption" tone="muted">
            {t('account.whatIsStoredBody')}
          </Text>
        </Card>

        <View style={{ flexDirection: 'row', gap: theme.spacing(2) }}>
          <Button
            label={t('account.signInTab')}
            variant={mode === 'signIn' ? 'primary' : 'secondary'}
            haptic={false}
            style={{ flex: 1 }}
            onPress={() => setMode('signIn')}
          />
          <Button
            label={t('account.signUpTab')}
            variant={mode === 'signUp' ? 'primary' : 'secondary'}
            haptic={false}
            style={{ flex: 1 }}
            onPress={() => setMode('signUp')}
          />
        </View>

        {errorMessage ? (
          <Card tone="muted" style={{ gap: theme.spacing(1) }}>
            <Text variant="body" tone="muted">
              {errorMessage}
            </Text>
          </Card>
        ) : null}

        <View style={{ gap: theme.spacing(4) }}>
          <Field
            label={t('account.emailLabel')}
            value={email}
            onChangeText={setEmail}
            placeholder={t('account.emailPlaceholder')}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Field
            label={t('account.passwordLabel')}
            value={password}
            onChangeText={setPassword}
            placeholder={t('account.passwordPlaceholder')}
            secureTextEntry
            autoCapitalize="none"
          />
        </View>

        <Button
          label={mode === 'signUp' ? t('account.signUpAction') : t('account.signInAction')}
          size="lg"
          loading={busy === 'auth'}
          disabled={!email.trim() || password.length < 6}
          onPress={() => void submitAuth()}
        />

        {mode === 'signIn' ? (
          <Button
            label={t('account.forgotPassword')}
            variant="ghost"
            haptic={false}
            loading={busy === 'reset'}
            disabled={!email.trim()}
            onPress={() => void submitReset()}
          />
        ) : null}

        {googleAvailable ? (
          <View style={{ gap: theme.spacing(2) }}>
            <Text variant="caption" tone="faint" center>
              {t('account.orDivider')}
            </Text>
            {Platform.OS === 'web' ? (
              <Button
                label={t('account.continueWithGoogle')}
                variant="secondary"
                loading={busy === 'auth'}
                onPress={() => void submitGoogleWeb()}
              />
            ) : (
              <GoogleSignInButton
                label={t('account.continueWithGoogle')}
                webClientId={GOOGLE_WEB_CLIENT_ID}
                genericErrorMessage={t('account.errorGeneric')}
                onError={setErrorMessage}
                onBeforeSignIn={clearSignOutSuppression}
              />
            )}
          </View>
        ) : null}

        <Text variant="caption" tone="faint">
          {t('account.appleNotice')}
        </Text>
      </View>
    </Screen>
  );
}
