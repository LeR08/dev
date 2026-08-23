import * as WebBrowser from 'expo-web-browser';
import React, { useState } from 'react';
import { View } from 'react-native';

import { AdBanner } from '@/ads/AdBanner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { useTranslation } from '@/i18n/I18nProvider';
import { donationUrl, isDonationConfigured } from '@/payments/paypal';
import { useSupporterSubscription } from '@/payments/useSupporterSubscription';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * The supporter screen.
 *
 * Removing the launch message and the banner goes through Google Play Billing,
 * because Play's Payments policy requires it for anything unlocked inside the
 * app. Donations unlock nothing, so those stay on a hosted PayPal page opened
 * in the system browser — no SDK, no card field here, no secret in this repo.
 *
 * The price shown comes from Play rather than from our own copy, so it is
 * right in every currency and cannot drift from what is actually charged.
 */
export default function SubscriptionScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const toast = useToast();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleError = (message: string) => setErrorMessage(message || t('account.errorGeneric'));
  const { ready, priceLabel, busy, premium, purchase } = useSupporterSubscription(handleError);

  const openDonation = async () => {
    try {
      await WebBrowser.openBrowserAsync(donationUrl());
    } catch {
      toast.show({ message: t('subscriptionScreen.openFailedToast') });
    }
  };

  return (
    <Screen>
      <View style={{ gap: theme.spacing(4), paddingTop: theme.spacing(4) }}>
        <Card tone="accent" style={{ gap: theme.spacing(2) }}>
          <Text variant="title">{priceLabel ?? t('subscriptionScreen.priceLabel')}</Text>
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
          <Card tone="muted" style={{ gap: theme.spacing(2) }}>
            <Text variant="heading">{t('subscriptionScreen.activeTitle')}</Text>
            <Text variant="body" tone="muted">
              {t('subscriptionScreen.activeBody')}
            </Text>
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

            {ready ? (
              <>
                <Button
                  label={t('subscriptionScreen.subscribeAction')}
                  size="lg"
                  loading={busy}
                  onPress={() => void purchase()}
                />
                <Text variant="caption" tone="faint">
                  {t('subscriptionScreen.billingNotice')}
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
              onPress={() => void openDonation()}
            />
          </Card>
        ) : null}
      </View>
    </Screen>
  );
}
