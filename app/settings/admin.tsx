import { useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useAppInfo } from '@/hooks/useAppInfo';
import { CATALOG_NAME_OVERRIDE_COUNT } from '@/i18n/catalogNames';
import { useTranslation } from '@/i18n/I18nProvider';
import { LANGUAGE_NAMES } from '@/i18n';
import { useApp } from '@/state/AppProvider';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * Local, test-mode preview of both the "user" and "admin" perspectives on
 * this single device — there is no server and no other real users yet, so
 * everything here is this device's own data (spec follow-up: "gère les
 * choses back test, le côté user et admin, avant l'hébergement"). Meant as
 * a starting point for a real admin surface once there's something to
 * actually administer.
 */
export default function AdminScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t, language } = useTranslation();
  const { entries, drinks, tickets, settings } = useApp();
  const { appVersion, platform } = useAppInfo();

  const customDrinkCount = drinks.filter((drink) => drink.isCustom).length;
  const openTickets = tickets.filter((ticket) => ticket.status === 'open').length;
  const closedTickets = tickets.length - openTickets;

  return (
    <Screen>
      <View style={{ gap: theme.spacing(4), paddingTop: theme.spacing(4) }}>
        <Card tone="muted" style={{ gap: theme.spacing(1) }}>
          <Text variant="caption" tone="muted">
            {t('adminScreen.banner')}
          </Text>
        </Card>

        <Card style={{ gap: theme.spacing(2) }}>
          <Text variant="heading">{t('adminScreen.userSideTitle')}</Text>
          <Row label={t('adminScreen.entriesLabel')} value={`${entries.length}`} />
          <Row label={t('adminScreen.customDrinksLabel')} value={`${customDrinkCount}`} />
        </Card>

        <Card style={{ gap: theme.spacing(2) }}>
          <Text variant="heading">{t('adminScreen.adminSideTitle')}</Text>
          <Row label={t('adminScreen.ticketsOpenLabel')} value={`${openTickets}`} />
          <Row label={t('adminScreen.ticketsClosedLabel')} value={`${closedTickets}`} />
          <Button
            label={t('adminScreen.manageTicketsAction')}
            variant="secondary"
            onPress={() => router.push('/settings/tickets')}
          />
          <View style={{ height: 1, backgroundColor: theme.colors.border, marginVertical: theme.spacing(1) }} />
          <Text variant="body" tone="muted">
            {settings.subscription.status === 'active'
              ? t('adminScreen.subscriptionActive', {
                  provider: settings.subscription.provider === 'paypal' ? 'PayPal' : 'Stripe',
                })
              : t('adminScreen.subscriptionNone')}
          </Text>
          <Button
            label={t('adminScreen.manageSubscriptionAction')}
            variant="secondary"
            onPress={() => router.push('/settings/subscription')}
          />
        </Card>

        <Card style={{ gap: theme.spacing(2) }}>
          <Text variant="heading">{t('adminScreen.catalogOverridesTitle')}</Text>
          <Text variant="body" tone="muted">
            {t('adminScreen.catalogOverridesBody', { count: CATALOG_NAME_OVERRIDE_COUNT })}
          </Text>
        </Card>

        <Card style={{ gap: theme.spacing(2) }}>
          <Text variant="heading">{t('adminScreen.appInfoTitle')}</Text>
          <Row label={t('adminScreen.versionLabel')} value={appVersion} />
          <Row label={t('adminScreen.platformLabel')} value={platform} />
          <Row label={t('adminScreen.languageLabel')} value={LANGUAGE_NAMES[language]} />
        </Card>
      </View>
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: theme.spacing(2) }}>
      <Text variant="body" tone="muted">
        {label}
      </Text>
      <Text variant="body">{value}</Text>
    </View>
  );
}
