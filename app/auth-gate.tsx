import React, { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';

import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { LanguagePickerModal } from '@/components/ui/LanguagePickerModal';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { LANGUAGE_NAMES } from '@/i18n';
import { useTranslation } from '@/i18n/I18nProvider';
import {
  sendPasswordReset,
  signInWithEmail,
  signInWithGooglePopup,
  signUpWithEmail,
} from '@/sync/auth';
import { isGoogleSignInAvailable } from '@/sync/firebaseApp';
import { useApp } from '@/state/AppProvider';
import { useTheme } from '@/theme/ThemeProvider';

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';

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
 * Mandatory sign-in gate — reached only when Firebase is configured and no
 * account is signed in (see app/_layout.tsx's Boot()). Once settings.account
 * becomes non-null, that same redirect logic moves on automatically; this
 * screen's only job is to make that happen, it never navigates itself.
 */
export default function AuthGateScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const toast = useToast();
  const { settings, updateSettings } = useApp();

  const [mode, setMode] = useState<'signIn' | 'signUp'>('signUp');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<'auth' | 'reset' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [languagePickerVisible, setLanguagePickerVisible] = useState(false);
  const googleAvailable = isGoogleSignInAvailable();

  const submitAuth = async () => {
    setBusy('auth');
    setErrorMessage(null);
    try {
      if (mode === 'signUp') {
        await signUpWithEmail(email.trim(), password);
      } else {
        await signInWithEmail(email.trim(), password);
      }
    } catch (cause) {
      setErrorMessage(describeAuthError(cause, t));
    } finally {
      setBusy(null);
    }
  };

  const submitGoogleWeb = async () => {
    setBusy('auth');
    setErrorMessage(null);
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

  return (
    <Screen bottomInset={theme.spacing(6)}>
      <View style={{ gap: theme.spacing(5), paddingTop: theme.spacing(6) }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('settings.language.changeA11y')}
          onPress={() => setLanguagePickerVisible(true)}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing(2.5),
            paddingVertical: theme.spacing(3),
            paddingHorizontal: theme.spacing(4),
            borderRadius: theme.radius.lg,
            backgroundColor: theme.accent.soft,
            opacity: pressed ? 0.75 : 1,
          })}
        >
          <Icon name="globe" size={18} color={theme.accent.strong} strokeWidth={1.8} />
          <Text variant="label" style={{ flex: 1, color: theme.accent.strong }}>
            {LANGUAGE_NAMES[settings.language]}
          </Text>
          <View style={{ transform: [{ rotate: '180deg' }] }}>
            <Icon name="chevronLeft" size={16} color={theme.accent.strong} strokeWidth={2} />
          </View>
        </Pressable>

        <View style={{ gap: theme.spacing(3), alignItems: 'flex-start' }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: theme.accent.soft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="user" size={26} color={theme.accent.base} strokeWidth={2} />
          </View>
          <Text variant="display">{t('authGate.title')}</Text>
          <Text variant="body" tone="muted">
            {t('authGate.subtitle')}
          </Text>
        </View>

        <Card tone="muted" style={{ gap: theme.spacing(1) }}>
          <Text variant="caption" tone="muted">
            {t('authGate.dataNotice')}
          </Text>
        </Card>

        <View style={{ flexDirection: 'row', gap: theme.spacing(2) }}>
          <Button
            label={t('account.signUpTab')}
            variant={mode === 'signUp' ? 'primary' : 'secondary'}
            haptic={false}
            style={{ flex: 1 }}
            onPress={() => setMode('signUp')}
          />
          <Button
            label={t('account.signInTab')}
            variant={mode === 'signIn' ? 'primary' : 'secondary'}
            haptic={false}
            style={{ flex: 1 }}
            onPress={() => setMode('signIn')}
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
              />
            )}
          </View>
        ) : null}

        <Text variant="caption" tone="faint">
          {t('account.appleNotice')}
        </Text>
      </View>

      <LanguagePickerModal
        visible={languagePickerVisible}
        selected={settings.language}
        onSelect={(language) => void updateSettings({ language })}
        onDismiss={() => setLanguagePickerVisible(false)}
      />
    </Screen>
  );
}
