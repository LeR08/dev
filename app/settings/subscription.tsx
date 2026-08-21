import * as WebBrowser from 'expo-web-browser';
import React from 'react';
import { Alert, View } from 'react-native';

import { AdBanner } from '@/ads/AdBanner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { isPremium } from '@/domain/subscription';
import { useTranslation } from '@/i18n/I18nProvider';
import {
  donationUrl,
  isDonationConfigured,
  isSubscriptionConfigured,
  subscriptionUrl,
} from '@/payments/paypal';
import { useApp } from '@/state/AppProvider';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * The supporter screen.
 *
 * Subscribing and donating both hand off to a hosted PayPal page in the system
 * browser — no card details are ever entered in the app and no payment secret
 * lives in this repo. Coming back, the app has no way to check whether the
 * subscription actually went through (see src/payments/paypal.ts), so the
 * unlock is on the person's word and is stored on this device only. The copy
 * says so rather than implying a verified purchase.
 */
export default function SubscriptionScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const toast = useToast();
  const { settings, updateSettings } = useApp();

  const premium = isPremium(settings.subscription.status);

  const open = async (url: string) => {
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch {
      toast.show({ message: t('subscriptionScreen.openFailedToast') });
    }
  };

  const subscribe = async () => {
    await open(subscriptionUrl());
    // Asked only after the browser closes, so the question lands when there is
    // actually something to answer.
    Alert.alert(
      t('subscriptionScreen.confirmTitle'),
      t('subscriptionScreen.confirmBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('subscriptionScreen.confirmAction'),
          onPress: () => {
            void updateSettings({ subscription: { status: 'active', activatedAt: Date.now() } });
            toast.show({ message: t('subscriptionScreen.activatedToast') });
          },
        },
      ]
    );
  };

  const deactivate = () => {
    void updateSettings({ subscription: { status: 'free', activatedAt: null } });
    toast.show({ message: t('subscriptionScreen.deactivatedToast') });
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

        {premium ? (
          <Card tone="muted" style={{ gap: theme.spacing(2) }}>
            <Text variant="heading">{t('subscriptionScreen.activeTitle')}</Text>
            <Text variant="body" tone="muted">
              {t('subscriptionScreen.activeBody')}
            </Text>
            <Button label={t('subscriptionScreen.deactivateAction')} variant="secondary" onPress={deactivate} />
          </Card>
        ) : (
          <>
            <Card style={{ gap: theme.spacing(2) }}>
              <Text variant="heading">{t('subscriptionScreen.freeTierTitle')}</Text>
              <Text variant="body" tone="muted">
                {t('subscriptionScreen.freeTierBody')}
              </Text>
              <AdBanner />
            </Card>

            {isSubscriptionConfigured() ? (
              <>
                <Button
                  label={t('subscriptionScreen.subscribeAction')}
                  size="lg"
                  onPress={() => void subscribe()}
                />
                <Text variant="caption" tone="faint">
                  {t('subscriptionScreen.honourNotice')}
                </Text>
              </>
            ) : (
              <Card tone="muted" style={{ gap: theme.spacing(1) }}>
                <Text variant="caption" tone="muted">
                  {t('subscriptionScreen.previewNotice')}
                </Text>
              </Card>
            )}
          </>
        )}

        {isDonationConfigured() ? (
          <Card style={{ gap: theme.spacing(2) }}>
            <Text variant="heading">{t('subscriptionScreen.donateTitle')}</Text>
            <Text variant="body" tone="muted">
              {t('subscriptionScreen.donateBody')}
            </Text>
            <Button
              label={t('subscriptionScreen.donateAction')}
              variant="secondary"
              onPress={() => void open(donationUrl())}
            />
          </Card>
        ) : null}
      </View>
    </Screen>
  );
}
