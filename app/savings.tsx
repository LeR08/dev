import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { View } from 'react-native';

import { BarChart, type BarDatum } from '@/components/charts/BarChart';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { Segmented } from '@/components/ui/Segmented';
import { Text } from '@/components/ui/Text';
import { periodRange, trailingRange, type Range } from '@/domain/dates';
import { formatMoney } from '@/domain/format';
import { computeSavings, savingsHeadline } from '@/domain/savings';
import { useNow } from '@/hooks/useNow';
import { useTranslation } from '@/i18n/I18nProvider';
import { useApp } from '@/state/AppProvider';
import { useTheme } from '@/theme/ThemeProvider';

type Window = 'week' | 'month' | 'year' | 'sinceTracking';

export default function SavingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const now = useNow();
  const { t } = useTranslation();
  const { entries, settings, profile } = useApp();
  const [window, setWindow] = useState<Window>('month');

  const range = useMemo<Range>(() => {
    switch (window) {
      case 'week':
        return periodRange(now, 'week', settings.weekStartsOn);
      case 'month':
        return periodRange(now, 'month', settings.weekStartsOn);
      case 'year':
        return trailingRange(now, 'month', 12, settings.weekStartsOn);
      case 'sinceTracking':
        return { start: profile?.createdAt ?? now, end: now };
    }
  }, [now, profile?.createdAt, settings.weekStartsOn, window]);

  const savings = useMemo(
    () => computeSavings(profile?.spendBeforeTrackingPerDay ?? null, entries, range),
    [entries, profile?.spendBeforeTrackingPerDay, range]
  );

  if (!profile || profile.spendBeforeTrackingPerDay === null) {
    return (
      <Screen>
        <EmptyState
          title={t('savings.noBaselineTitle')}
          body={t('savings.noBaselinePrompt')}
          actionLabel={t('savings.addBaselineAction')}
          onAction={() => router.push('/settings/profile')}
          glyph="€"
        />
      </Screen>
    );
  }

  const bars: BarDatum[] = savings
    ? [
        { key: 'expected', label: t('savings.expected'), value: savings.expectedSpend },
        { key: 'actual', label: t('savings.actual'), value: savings.actualSpend, highlight: true },
      ]
    : [];

  const headline = savings ? savingsHeadline(savings.saved) : 'even';
  const headlineLabel =
    headline === 'saved'
      ? t('savings.savedLabel')
      : headline === 'spentMore'
        ? t('savings.spentMoreLabel')
        : t('savings.evenLabel');

  return (
    <Screen>
      <View style={{ gap: theme.spacing(4), paddingTop: theme.spacing(4) }}>
        <Segmented<Window>
          options={[
            { value: 'week', label: t('insights.week') },
            { value: 'month', label: t('insights.month') },
            { value: 'year', label: t('insights.year') },
            { value: 'sinceTracking', label: t('savings.sinceTracking') },
          ]}
          value={window}
          onChange={setWindow}
        />

        <Card tone="accent" style={{ gap: theme.spacing(1) }}>
          <Text variant="caption" tone="accent" overline>
            {t('savings.cardTitle')}
          </Text>
          <Text variant="title">
            {formatMoney(Math.abs(savings?.saved ?? 0), settings.currency)} {headlineLabel}
          </Text>
          <Text variant="caption" tone="muted">
            {t('savings.disclaimerNeutral')}
          </Text>
        </Card>

        <Card style={{ gap: theme.spacing(3) }}>
          <Text variant="heading">
            {t('savings.expected')} / {t('savings.actual')}
          </Text>
          <BarChart data={bars} height={140} formatValue={(value) => formatMoney(value, settings.currency)} />
        </Card>

        <Button label={t('settings.profileRow')} variant="ghost" onPress={() => router.push('/settings/profile')} />
      </View>
    </Screen>
  );
}
