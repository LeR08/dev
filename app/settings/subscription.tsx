import React, { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { formatLongDate } from '@/domain/format';
import { generateAffiliateCode, isPlausibleAffiliateCode } from '@/domain/subscription';
import { useTranslation } from '@/i18n/I18nProvider';
import { useApp } from '@/state/AppProvider';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * A local-only mock of a paid tier (spec follow-up: "abonnement minime...
 * interface de test"). No payment processor, no server, no account — this
 * previews the idea so it can be evaluated before any real billing is built.
 * Nothing in the rest of the app checks this flag; there is nothing to
 * unlock yet.
 */
export default function SubscriptionScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { settings, updateSettings } = useApp();
  const toast = useToast();
  const [referralInput, setReferralInput] = useState('');
  const [subscribing, setSubscribing] = useState(false);

  const { subscription } = settings;
  const referralInvalid = referralInput.trim() !== '' && !isPlausibleAffiliateCode(referralInput);

  const subscribe = async () => {
    setSubscribing(true);
    try {
      const code = subscription.ownCode ?? generateAffiliateCode();
      await updateSettings({
        subscription: {
          status: 'testActive',
          ownCode: code,
          referredByCode: !referralInvalid && referralInput.trim() !== '' ? referralInput.trim().toUpperCase() : null,
          activatedAt: Date.now(),
        },
      });
      toast.show({ message: t('subscriptionScreen.subscribedToast') });
    } finally {
      setSubscribing(false);
    }
  };

  const cancel = async () => {
    await updateSettings({ subscription: { ...subscription, status: 'none', activatedAt: null } });
    toast.show({ message: t('subscriptionScreen.cancelledToast') });
  };

  return (
    <Screen>
      <View style={{ gap: theme.spacing(4), paddingTop: theme.spacing(4) }}>
        <Card tone="muted" style={{ gap: theme.spacing(1) }}>
          <Text variant="caption" tone="muted">
            {t('subscriptionScreen.badge')}
          </Text>
        </Card>

        <Card tone="accent" style={{ gap: theme.spacing(2) }}>
          <Text variant="title">{t('subscriptionScreen.priceLabel')}</Text>
          <Text variant="body" tone="muted">
            {t('subscriptionScreen.intro')}
          </Text>
        </Card>

        {subscription.status === 'testActive' ? (
          <>
            <Card style={{ gap: theme.spacing(2) }}>
              <Text variant="heading">{t('subscriptionScreen.activeTitle')}</Text>
              {subscription.activatedAt ? (
                <Text variant="body" tone="muted">
                  {t('subscriptionScreen.activeSince', { date: formatLongDate(subscription.activatedAt) })}
                </Text>
              ) : null}
              {subscription.referredByCode ? (
                <Text variant="caption" tone="faint">
                  {t('subscriptionScreen.referredByLabel', { code: subscription.referredByCode })}
                </Text>
              ) : null}
            </Card>

            <Card style={{ gap: theme.spacing(2) }}>
              <Text variant="caption" tone="muted" overline>
                {t('subscriptionScreen.yourCodeLabel')}
              </Text>
              <View
                style={{
                  paddingVertical: theme.spacing(3),
                  paddingHorizontal: theme.spacing(4),
                  borderRadius: theme.radius.md,
                  backgroundColor: theme.colors.surfaceMuted,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  alignItems: 'center',
                }}
              >
                <Text variant="title" style={{ letterSpacing: 2 }}>
                  {subscription.ownCode}
                </Text>
              </View>
              <Text variant="caption" tone="faint">
                {t('subscriptionScreen.yourCodeHint')}
              </Text>
            </Card>

            <Button
              label={t('subscriptionScreen.cancelAction')}
              variant="ghost"
              haptic={false}
              onPress={() => void cancel()}
            />
          </>
        ) : (
          <>
            <View>
              <Field
                label={t('subscriptionScreen.referralInputLabel')}
                value={referralInput}
                onChangeText={setReferralInput}
                placeholder={t('subscriptionScreen.referralInputPlaceholder')}
                autoCapitalize="characters"
                autoCorrect={false}
                hint={referralInvalid ? t('subscriptionScreen.referralInvalidHint') : undefined}
              />
            </View>
            <Button
              label={t('subscriptionScreen.subscribeAction')}
              size="lg"
              onPress={() => void subscribe()}
              loading={subscribing}
            />
          </>
        )}
      </View>
    </Screen>
  );
}
