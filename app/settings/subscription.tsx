import React from 'react';
import { View } from 'react-native';

import { AdBanner } from '@/ads/AdBanner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { useTranslation } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * Preview-only pricing screen. Real payment processing (Stripe/PayPal
 * checkout opened in the system browser, plus the backend that held their
 * secret keys) has been removed deliberately — this screen now exists purely
 * to show what the offer *looks* like, so the layout and copy can be judged
 * before committing to a payment provider at all.
 *
 * The subscribe buttons are intentionally inert: they acknowledge the tap and
 * say the offer isn't open yet, rather than pretending to start a checkout
 * that no longer exists. `settings.subscription.status` still exists and still
 * gates the launch interstitial, so nothing else in the app had to change —
 * it simply stays 'free' now, since nothing flips it.
 */
export default function SubscriptionScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const toast = useToast();

  const notYetAvailable = () => toast.show({ message: t('subscriptionScreen.notAvailableToast') });

  return (
    <Screen>
      <View style={{ gap: theme.spacing(4), paddingTop: theme.spacing(4) }}>
        <Card tone="accent" style={{ gap: theme.spacing(2) }}>
          <Text variant="title">{t('subscriptionScreen.priceLabel')}</Text>
          <Text variant="body" tone="muted">
            {t('subscriptionScreen.intro')}
          </Text>
        </Card>

        <Card tone="muted" style={{ gap: theme.spacing(1) }}>
          <Text variant="caption" tone="muted">
            {t('subscriptionScreen.previewNotice')}
          </Text>
        </Card>

        <Card style={{ gap: theme.spacing(2) }}>
          <Text variant="heading">{t('subscriptionScreen.freeTierTitle')}</Text>
          <Text variant="body" tone="muted">
            {t('subscriptionScreen.freeTierBody')}
          </Text>
          <AdBanner />
        </Card>

        <Button label={t('subscriptionScreen.subscribeAction')} size="lg" onPress={notYetAvailable} />
      </View>
    </Screen>
  );
}
