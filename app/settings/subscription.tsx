import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, View } from 'react-native';

import { AdBanner } from '@/ads/AdBanner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { formatLongDate } from '@/domain/format';
import { generateUserId, isPremium } from '@/domain/subscription';
import { useTranslation } from '@/i18n/I18nProvider';
import {
  BackendNotConfiguredError,
  createPaypalApprovalUrl,
  createStripeCheckoutUrl,
  createStripePortalUrl,
  fetchSubscriptionStatus,
} from '@/payments/api';
import { useApp } from '@/state/AppProvider';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * Real freemium subscription: Stripe and PayPal Checkout are opened in the
 * system browser (their secret keys can only ever live on the backend in
 * `server/`, never in this app), and this screen polls the backend for the
 * resulting status. Premium's only effect today is removing the launch
 * message and support banner below — see README's "Freemium, payments &
 * ads" section for why nothing about logging drinks is ever paywalled.
 */
export default function SubscriptionScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { settings, updateSettings } = useApp();
  const toast = useToast();
  const [busy, setBusy] = useState<'stripe' | 'paypal' | 'portal' | 'refresh' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const userIdRef = useRef(settings.subscription.userId);

  const { subscription } = settings;
  const premium = isPremium(subscription.status);

  // Every device needs its own opaque id before it can be looked up on the
  // backend — generated once, the moment this screen is first opened.
  useEffect(() => {
    if (!settings.subscription.userId) {
      const userId = generateUserId();
      userIdRef.current = userId;
      void updateSettings({ subscription: { ...settings.subscription, userId } });
    } else {
      userIdRef.current = settings.subscription.userId;
    }
    // Only ever needs to run once per device — settings.subscription is
    // intentionally excluded so writing userId above doesn't loop this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshStatus = useCallback(async () => {
    const userId = userIdRef.current;
    if (!userId) return;
    setBusy('refresh');
    setErrorMessage(null);
    try {
      const remote = await fetchSubscriptionStatus(userId);
      await updateSettings({
        subscription: {
          ...settings.subscription,
          status: remote.status,
          provider: remote.provider,
          activatedAt: remote.status === 'active' ? (settings.subscription.activatedAt ?? Date.now()) : settings.subscription.activatedAt,
          lastCheckedAt: Date.now(),
        },
      });
    } catch (cause) {
      setErrorMessage(cause instanceof BackendNotConfiguredError ? t('subscriptionScreen.backendNotConfigured') : t('subscriptionScreen.checkFailed'));
    } finally {
      setBusy(null);
    }
    // settings.subscription intentionally excluded: this reads the latest
    // value via the closure at call time, and re-running on every settings
    // change would refetch on our own writes below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, updateSettings]);

  // Checkout/approval happens in the system browser, outside the app — the
  // most reliable moment to pick up the result is when the user comes back.
  useEffect(() => {
    const subscriptionListener = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshStatus();
    });
    return () => subscriptionListener.remove();
  }, [refreshStatus]);

  const subscribeWithStripe = async () => {
    const userId = userIdRef.current;
    if (!userId) return;
    setBusy('stripe');
    setErrorMessage(null);
    try {
      const url = await createStripeCheckoutUrl(userId);
      await Linking.openURL(url);
      await updateSettings({ subscription: { ...settings.subscription, status: 'pending', provider: 'stripe' } });
    } catch (cause) {
      setErrorMessage(cause instanceof BackendNotConfiguredError ? t('subscriptionScreen.backendNotConfigured') : t('subscriptionScreen.checkoutFailed'));
    } finally {
      setBusy(null);
    }
  };

  const subscribeWithPaypal = async () => {
    const userId = userIdRef.current;
    if (!userId) return;
    setBusy('paypal');
    setErrorMessage(null);
    try {
      const url = await createPaypalApprovalUrl(userId);
      await Linking.openURL(url);
      await updateSettings({ subscription: { ...settings.subscription, status: 'pending', provider: 'paypal' } });
    } catch (cause) {
      setErrorMessage(cause instanceof BackendNotConfiguredError ? t('subscriptionScreen.backendNotConfigured') : t('subscriptionScreen.checkoutFailed'));
    } finally {
      setBusy(null);
    }
  };

  const manageStripeBilling = async () => {
    const userId = userIdRef.current;
    if (!userId) return;
    setBusy('portal');
    setErrorMessage(null);
    try {
      const url = await createStripePortalUrl(userId);
      await Linking.openURL(url);
    } catch (cause) {
      setErrorMessage(cause instanceof BackendNotConfiguredError ? t('subscriptionScreen.backendNotConfigured') : t('subscriptionScreen.checkoutFailed'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen>
      <View style={{ gap: theme.spacing(4), paddingTop: theme.spacing(4) }}>
        <Card tone="accent" style={{ gap: theme.spacing(2) }}>
          <Text variant="title">{t('subscriptionScreen.priceLabel')}</Text>
          <Text variant="body" tone="muted">
            {t('subscriptionScreen.intro')}
          </Text>
        </Card>

        {errorMessage ? (
          <Card tone="muted" style={{ gap: theme.spacing(1) }}>
            <Text variant="body" tone="muted">
              {errorMessage}
            </Text>
          </Card>
        ) : null}

        {premium ? (
          <Card style={{ gap: theme.spacing(2) }}>
            <Text variant="heading">{t('subscriptionScreen.activeTitle')}</Text>
            {subscription.activatedAt ? (
              <Text variant="body" tone="muted">
                {t('subscriptionScreen.activeSince', { date: formatLongDate(subscription.activatedAt) })}
              </Text>
            ) : null}
            <Text variant="caption" tone="faint">
              {subscription.provider === 'stripe'
                ? t('subscriptionScreen.viaStripe')
                : t('subscriptionScreen.viaPaypal')}
            </Text>
            {subscription.provider === 'stripe' ? (
              <Button
                label={t('subscriptionScreen.manageBillingAction')}
                variant="secondary"
                loading={busy === 'portal'}
                onPress={() => void manageStripeBilling()}
              />
            ) : (
              <Text variant="caption" tone="faint">
                {t('subscriptionScreen.managePaypalHint')}
              </Text>
            )}
          </Card>
        ) : (
          <>
            {subscription.status === 'pending' ? (
              <Card tone="muted" style={{ gap: theme.spacing(1) }}>
                <Text variant="body" tone="muted">
                  {t('subscriptionScreen.pendingHint')}
                </Text>
              </Card>
            ) : null}

            <Card style={{ gap: theme.spacing(2) }}>
              <Text variant="heading">{t('subscriptionScreen.freeTierTitle')}</Text>
              <Text variant="body" tone="muted">
                {t('subscriptionScreen.freeTierBody')}
              </Text>
              <AdBanner />
            </Card>

            <View style={{ gap: theme.spacing(2) }}>
              <Button
                label={t('subscriptionScreen.subscribeStripeAction')}
                size="lg"
                loading={busy === 'stripe'}
                onPress={() => void subscribeWithStripe()}
              />
              <Button
                label={t('subscriptionScreen.subscribePaypalAction')}
                size="lg"
                variant="secondary"
                loading={busy === 'paypal'}
                onPress={() => void subscribeWithPaypal()}
              />
            </View>
          </>
        )}

        <Button
          label={t('subscriptionScreen.refreshAction')}
          variant="ghost"
          haptic={false}
          loading={busy === 'refresh'}
          onPress={() => void refreshStatus().then(() => toast.show({ message: t('subscriptionScreen.refreshedToast') }))}
        />
      </View>
    </Screen>
  );
}
