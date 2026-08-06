import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { ScrollView, View } from 'react-native';

import { BacCard } from '@/components/BacCard';
import { BarChart, type BarDatum } from '@/components/charts/BarChart';
import { EntryRow } from '@/components/EntryRow';
import { SavingsHeroCard } from '@/components/SavingsHeroCard';
import { StatCard } from '@/components/StatCard';
import { StreakCard } from '@/components/StreakCard';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { FadeInView } from '@/components/ui/FadeInView';
import { Icon } from '@/components/ui/Icon';
import { LanguagePill } from '@/components/ui/LanguagePill';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { gramsToIntake } from '@/domain/alcohol';
import { dayKey, periodRange, trailingRange } from '@/domain/dates';
import { greeting } from '@/domain/encouragement';
import { formatIntakeValue, formatLongDate, formatMoney, formatWeekdayShort } from '@/domain/format';
import { computeSavings } from '@/domain/savings';
import {
  bucketize,
  currentAlcoholFreeStreak,
  filterByRange,
  longestAlcoholFreeStreak,
  topDrinks,
  totals,
} from '@/domain/stats';
import type { Drink, Entry } from '@/domain/types';
import { useNow } from '@/hooks/useNow';
import { useQuickLog } from '@/hooks/useQuickLog';
import { useTranslation } from '@/i18n/I18nProvider';
import { useApp } from '@/state/AppProvider';
import { useTheme } from '@/theme/ThemeProvider';

const QUICK_ADD_LIMIT = 6;

export default function TodayScreen() {
  const theme = useTheme();
  const router = useRouter();
  const now = useNow();
  const { t } = useTranslation();
  const { entries, drinks, settings, profile } = useApp();
  const quickLog = useQuickLog();

  const today = useMemo(() => periodRange(now, 'day', settings.weekStartsOn), [now, settings.weekStartsOn]);
  const todayEntries = useMemo(() => filterByRange(entries, today), [entries, today]);
  const todayTotals = useMemo(() => totals(todayEntries), [todayEntries]);

  const week = useMemo(
    () => periodRange(now, 'week', settings.weekStartsOn),
    [now, settings.weekStartsOn]
  );
  const weekTotals = useMemo(() => totals(filterByRange(entries, week)), [entries, week]);

  const streak = useMemo(() => currentAlcoholFreeStreak(entries, now), [entries, now]);
  const longestStreak = useMemo(() => longestAlcoholFreeStreak(entries, now), [entries, now]);

  const lastSevenDays = useMemo(() => {
    const range = trailingRange(now, 'day', 7, settings.weekStartsOn);
    return bucketize(entries, range, 'day', settings.weekStartsOn).map<BarDatum>((bucket) => ({
      key: bucket.key,
      label: formatWeekdayShort(bucket.start),
      value: gramsToIntake(bucket.grams, settings.intakeUnit, settings.standardDrinkGrams),
      highlight: bucket.key === dayKey(now),
    }));
  }, [entries, now, settings.intakeUnit, settings.standardDrinkGrams, settings.weekStartsOn]);

  const quickDrinks = useMemo(
    () => pickQuickDrinks(entries, drinks, now),
    [drinks, entries, now]
  );

  const savingsSinceTracking = useMemo(
    () => computeSavings(profile?.spendBeforeTrackingPerDay ?? null, entries, { start: profile?.createdAt ?? now, end: now }),
    [entries, now, profile?.createdAt, profile?.spendBeforeTrackingPerDay]
  );

  const todayIntake = gramsToIntake(todayTotals.grams, settings.intakeUnit, settings.standardDrinkGrams);
  const weekIntake = gramsToIntake(weekTotals.grams, settings.intakeUnit, settings.standardDrinkGrams);
  const greetingCopy = greeting(now);

  return (
    <Screen bottomInset={theme.spacing(4)}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: theme.spacing(2),
          paddingTop: theme.spacing(8),
          paddingBottom: theme.spacing(5),
        }}
      >
        <View style={{ gap: theme.spacing(2), flex: 1 }}>
          <Text variant="caption" tone="muted" overline>
            {formatLongDate(now)}
          </Text>
          <Text variant="title">
            {profile?.name ? `${t(greetingCopy.key as never)}, ${profile.name}` : t(greetingCopy.key as never)}
          </Text>
        </View>
        <LanguagePill onPress={() => router.push('/settings/language')} />
      </View>

      <View style={{ gap: theme.spacing(4) }}>
        <FadeInView delay={0}>
          <SavingsHeroCard
            saved={savingsSinceTracking?.saved ?? null}
            currency={settings.currency}
            onPress={() => router.push(profile?.spendBeforeTrackingPerDay != null ? '/savings' : '/settings/profile')}
          />
        </FadeInView>

        <FadeInView delay={40}>
          <Button
            label={t('today.logButton')}
            size="lg"
            onPress={() => router.push('/log')}
            icon={<Icon name="plus" size={20} color={theme.accent.onBase} strokeWidth={2.2} />}
          />
        </FadeInView>

        {quickDrinks.length > 0 ? (
          <FadeInView delay={80}>
            <View style={{ gap: theme.spacing(2) }}>
              <Text variant="caption" tone="muted" overline>
                {t('today.oneTap')}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: theme.spacing(2), paddingRight: theme.spacing(4) }}
              >
                {quickDrinks.map((drink) => (
                  <Chip
                    key={drink.id}
                    label={drink.name}
                    dotColor={theme.categoryColor(drink.category)}
                    onPress={() => {
                      quickLog(drink);
                    }}
                  />
                ))}
              </ScrollView>
            </View>
          </FadeInView>
        ) : null}

        <FadeInView delay={120}>
          <View style={{ flexDirection: 'row', gap: theme.spacing(3) }}>
            <StatCard
              label={t('today.todayLabel')}
              value={`${formatIntakeValue(todayIntake, settings.intakeUnit)} ${settings.intakeUnit === 'grams' ? t('today.unitGrams') : t('today.unitStandardDrinks')}`}
              detail={
                todayTotals.entries === 0
                  ? t('today.nothingLoggedYet')
                  : t(todayTotals.entries === 1 ? 'today.entryCountOne' : 'today.entryCountOther', {
                      count: todayTotals.entries,
                    })
              }
            />
            <StatCard
              label={t('today.weekLabel')}
              value={`${formatIntakeValue(weekIntake, settings.intakeUnit)} ${settings.intakeUnit === 'grams' ? t('today.unitGrams') : t('today.unitStandardDrinks')}`}
              detail={weekTotals.spend > 0 ? formatMoney(weekTotals.spend, settings.currency, { compact: true }) : undefined}
            />
          </View>
        </FadeInView>

        <FadeInView delay={160}>
          <StreakCard streak={streak} longest={longestStreak} />
        </FadeInView>

        <FadeInView delay={200}>
          <BacCard profile={profile} entries={entries} now={now} />
        </FadeInView>

        <FadeInView delay={240}>
          <Card style={{ gap: theme.spacing(3) }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text variant="heading">{t('today.last7Days')}</Text>
              <Text variant="caption" tone="muted">
                {settings.intakeUnit === 'grams' ? t('today.unitGrams') : t('today.unitStandardDrinks')}
              </Text>
            </View>
            <BarChart data={lastSevenDays} height={132} />
          </Card>
        </FadeInView>

        <FadeInView delay={280}>
          <Card style={{ gap: theme.spacing(1) }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: theme.spacing(1),
              }}
            >
              <Text variant="heading">{t('today.todaysLog')}</Text>
              {todayEntries.length > 0 ? (
                <Text variant="caption" tone="muted">
                  {t(todayEntries.length === 1 ? 'today.entryCountOne' : 'today.entryCountOther', {
                    count: todayEntries.length,
                  })}
                </Text>
              ) : null}
            </View>

            {todayEntries.length === 0 ? (
              <Text variant="body" tone="muted">
                {t('today.nothingLoggedToday')}
              </Text>
            ) : (
              todayEntries.map((entry, index) => (
                <View key={entry.id}>
                  {index > 0 ? <View style={{ height: 1, backgroundColor: theme.colors.border }} /> : null}
                  <EntryRow
                    entry={entry}
                    settings={settings}
                    onPress={() => router.push({ pathname: '/entry/[id]', params: { id: entry.id } })}
                  />
                </View>
              ))
            )}
          </Card>
        </FadeInView>
      </View>
    </Screen>
  );
}

/**
 * "Your usuals": the drinks logged most often lately, so the fast path reflects
 * actual habits. Falls back to a small spread of catalog drinks before there is
 * any history to learn from.
 */
function pickQuickDrinks(entries: Entry[], drinks: Drink[], now: number): Drink[] {
  const sixtyDaysAgo = now - 60 * 86_400_000;
  const recent = entries.filter((entry) => entry.consumedAt >= sixtyDaysAgo);
  const byName = new Map(drinks.map((drink) => [`${drink.category}:${drink.name.toLowerCase()}`, drink]));

  const usuals = topDrinks(recent, QUICK_ADD_LIMIT)
    .map((tally) => byName.get(`${tally.category}:${tally.name.toLowerCase()}`))
    .filter((drink): drink is Drink => Boolean(drink));

  if (usuals.length >= 3) return usuals;

  const fallbackIds = [
    'beer-lager-half',
    'wine-red-glass',
    'beer-lager-pint',
    'cocktail-spritz',
    'spirit-whisky',
    'wine-white-glass',
  ];
  const seen = new Set(usuals.map((drink) => drink.id));
  const fallback = fallbackIds
    .map((id) => drinks.find((drink) => drink.id === id))
    .filter((drink): drink is Drink => Boolean(drink) && !seen.has(drink!.id));

  return [...usuals, ...fallback].slice(0, QUICK_ADD_LIMIT);
}
