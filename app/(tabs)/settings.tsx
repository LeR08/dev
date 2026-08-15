import { useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FadeInView } from '@/components/ui/FadeInView';
import { Row, RowDivider } from '@/components/ui/Row';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { CURRENCIES } from '@/domain/format';
import { LANGUAGE_NAMES } from '@/i18n';
import { useTranslation } from '@/i18n/I18nProvider';
import { useApp } from '@/state/AppProvider';
import { ACCENTS } from '@/theme/palette';
import { useTheme } from '@/theme/ThemeProvider';

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { settings, drinks, entries, profile, tickets } = useApp();

  const customCount = drinks.filter((drink) => drink.isCustom).length;
  const currencyLabel = CURRENCIES.some((currency) => currency.code === settings.currency)
    ? t(`currencies.${settings.currency}` as never)
    : settings.currency;

  const goalSummary = () => {
    const parts: string[] = [];
    if (settings.goals.weeklyIntake !== null) {
      parts.push(t('settings.goalPerWeek', { count: settings.goals.weeklyIntake }));
    }
    if (settings.goals.alcoholFreeDaysPerWeek !== null) {
      parts.push(t('settings.goalFreeDays', { count: settings.goals.alcoholFreeDaysPerWeek }));
    }
    return parts.length > 0 ? parts.join(' · ') : t('settings.noneSet');
  };

  return (
    <Screen>
      <View style={{ paddingTop: theme.spacing(8), paddingBottom: theme.spacing(4) }}>
        <Text variant="title">{t('settings.title')}</Text>
      </View>

      <View style={{ gap: theme.spacing(4) }}>
        {settings.subscription.status !== 'active' ? (
          <FadeInView delay={0}>
            <Card tone="accent" style={{ gap: theme.spacing(2) }}>
              <Text variant="caption" tone="muted" overline>
                {t('shop.badge')}
              </Text>
              <Text variant="heading">{t('shop.title')}</Text>
              <Text variant="body" tone="muted">
                {t('shop.body', { price: t('subscriptionScreen.priceLabel') })}
              </Text>
              <Button label={t('shop.action')} onPress={() => router.push('/settings/subscription')} />
            </Card>
          </FadeInView>
        ) : null}

        <FadeInView delay={40}>
          <Card padded={false} style={{ paddingHorizontal: theme.spacing(4) }}>
            <Row
              title={t('nav.units')}
              subtitle={t('settings.unitsRowSubtitle')}
              value={settings.volumeUnit}
              onPress={() => router.push('/settings/units')}
            />
            <RowDivider />
            <Row
              title={t('settings.currencyRow')}
              value={currencyLabel}
              onPress={() => router.push('/settings/units')}
            />
            <RowDivider />
            <Row
              title={t('nav.personalGoals')}
              subtitle={t('settings.goalsRowSubtitle')}
              value={goalSummary()}
              onPress={() => router.push('/settings/goals')}
            />
          </Card>
        </FadeInView>

        <FadeInView delay={120}>
          <Card padded={false} style={{ paddingHorizontal: theme.spacing(4) }}>
            <Row
              title={t('nav.appearance')}
              subtitle={t('settings.appearanceRowSubtitle')}
              value={t(`accents.${settings.accent}` as never)}
              onPress={() => router.push('/settings/appearance')}
            />
            <RowDivider />
            <Row
              title={t('nav.myDrinks')}
              subtitle={t('settings.myDrinksRowSubtitle')}
              value={`${customCount}`}
              onPress={() => router.push('/drinks')}
            />
            <RowDivider />
            <Row
              title={t('nav.defaultPrices')}
              subtitle={t('settings.defaultPricesRowSubtitle')}
              onPress={() => router.push('/settings/prices')}
            />
          </Card>
        </FadeInView>

        <FadeInView delay={120}>
          <Card padded={false} style={{ paddingHorizontal: theme.spacing(4) }}>
            <Row
              title={t('settings.profileRow')}
              subtitle={t('settings.profileRowSubtitle')}
              value={profile ? undefined : t('common.notSet')}
              onPress={() => router.push('/settings/profile')}
            />
            <RowDivider />
            <Row
              title={t('settings.languageRow')}
              value={LANGUAGE_NAMES[settings.language]}
              onPress={() => router.push('/settings/language')}
            />
            <RowDivider />
            <Row
              title={t('settings.accountRow')}
              subtitle={t('settings.accountRowSubtitle')}
              value={settings.account?.email ?? t('settings.accountRowLocalOnly')}
              onPress={() => router.push('/settings/account')}
            />
          </Card>
        </FadeInView>

        <FadeInView delay={160}>
          <Card padded={false} style={{ paddingHorizontal: theme.spacing(4) }}>
            <Row
              title={t('nav.dataPrivacy')}
              subtitle={t('settings.dataRowSubtitle', { count: entries.length })}
              onPress={() => router.push('/settings/data')}
            />
            <RowDivider />
            <Row
              title={t('nav.subscription')}
              subtitle={t('settings.subscriptionRowSubtitle')}
              onPress={() => router.push('/settings/subscription')}
            />
          </Card>
        </FadeInView>

        <FadeInView delay={200}>
          <Card padded={false} style={{ paddingHorizontal: theme.spacing(4) }}>
            <Row title={t('settings.helpRow')} onPress={() => router.push('/help')} />
            <RowDivider />
            <Row
              title={t('settings.tutorialRow')}
              subtitle={t('settings.tutorialRowSubtitle')}
              onPress={() => router.push('/tutorial')}
            />
            <RowDivider />
            <Row
              title={t('settings.reportRow')}
              onPress={() => router.push('/settings/report')}
            />
            <RowDivider />
            <Row
              title={t('settings.myTicketsRow')}
              value={tickets.length > 0 ? `${tickets.length}` : undefined}
              onPress={() => router.push('/settings/tickets')}
            />
          </Card>
        </FadeInView>

        <FadeInView delay={240}>
          <Card padded={false} style={{ paddingHorizontal: theme.spacing(4) }}>
            <Text
              variant="caption"
              tone="muted"
              overline
              style={{ paddingTop: theme.spacing(3), paddingBottom: theme.spacing(1) }}
            >
              {t('settings.legalSectionTitle')}
            </Text>
            <Row
              title={t('settings.termsRow')}
              onPress={() => router.push({ pathname: '/settings/legal/[doc]', params: { doc: 'terms' } })}
            />
            <RowDivider />
            <Row
              title={t('settings.legalNoticeRow')}
              onPress={() => router.push({ pathname: '/settings/legal/[doc]', params: { doc: 'notice' } })}
            />
            <RowDivider />
            <Row
              title={t('settings.privacyRow')}
              onPress={() => router.push({ pathname: '/settings/legal/[doc]', params: { doc: 'privacy' } })}
            />
          </Card>
        </FadeInView>

        <View style={{ gap: theme.spacing(1), paddingHorizontal: theme.spacing(2) }}>
          <Text variant="caption" tone="faint">
            {t('settings.footerDisclaimer')}
          </Text>
        </View>
      </View>
    </Screen>
  );
}
