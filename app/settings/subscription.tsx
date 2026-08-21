import * as WebBrowser from 'expo-web-browser';
import React from 'react';
import { View } from 'react-native';

import { AdBanner } from '@/ads/AdBanner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { isPremium } from '@/domain/subscription';
import { useTranslation } from '@/i18n/I18nProvider';
import { donationUrl, isDonationConfigured } from '@/payments/paypal';
import { useApp } from '@/state/AppProvider';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * The supporter screen.
 *
 * Removing the launch message and the banner is a digital unlock, which Play's
 * Payments policy says must go through Play Billing — so that half is not open
 * yet and says so, rather than routing round the policy. `subscription.status`
 * is the field Billing will set; nothing flips it today.
 *
 * Donations are outside that policy because they unlock nothing, so they run
 * through a hosted PayPal page in the system browser. No SDK, no card field
 * here, no secret in this repo.
 */
export default function SubscriptionScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const toast = useToast();
  const { settings } = useApp();

  const premium = isPremium(settings.subscription.status);

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

            <Card tone="muted" style={{ gap: theme.spacing(1) }}>
              <Text variant="caption" tone="muted">
                {t('subscriptionScreen.previewNotice')}
              </Text>
            </Card>
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
