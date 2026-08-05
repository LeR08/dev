import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { ScrollView, View } from 'react-native';

import { BarChart, type BarDatum } from '@/components/charts/BarChart';
import { EntryRow } from '@/components/EntryRow';
import { StatCard } from '@/components/StatCard';
import { StreakCard } from '@/components/StreakCard';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { gramsToIntake } from '@/domain/alcohol';
import { dayKey, periodRange, trailingRange } from '@/domain/dates';
import { greeting } from '@/domain/encouragement';
import {
  formatIntake,
  formatLongDate,
  formatMoney,
  formatWeekdayShort,
  pluralize,
} from '@/domain/format';
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
import { useApp } from '@/state/AppProvider';
import { useTheme } from '@/theme/ThemeProvider';

const QUICK_ADD_LIMIT = 6;

export default function TodayScreen() {
  const theme = useTheme();
  const router = useRouter();
  const now = useNow();
  const { entries, drinks, settings } = useApp();
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

  const todayIntake = gramsToIntake(todayTotals.grams, settings.intakeUnit, settings.standardDrinkGrams);
  const weekIntake = gramsToIntake(weekTotals.grams, settings.intakeUnit, settings.standardDrinkGrams);

  return (
    <Screen bottomInset={theme.spacing(4)}>
      <View style={{ gap: theme.spacing(2), paddingTop: theme.spacing(8), paddingBottom: theme.spacing(5) }}>
        <Text variant="caption" tone="muted" overline>
          {formatLongDate(now)}
        </Text>
        <Text variant="title">{greeting(now)}</Text>
      </View>

      <View style={{ gap: theme.spacing(4) }}>
        <Button
          label="Log a drink"
          size="lg"
          onPress={() => router.push('/log')}
          icon={<Icon name="plus" size={20} color={theme.accent.onBase} strokeWidth={2.2} />}
        />

        {quickDrinks.length > 0 ? (
          <View style={{ gap: theme.spacing(2) }}>
            <Text variant="caption" tone="muted" overline>
              One tap
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
        ) : null}

        <View style={{ flexDirection: 'row', gap: theme.spacing(3) }}>
          <StatCard
            label="Today"
            value={formatIntake(todayIntake, settings.intakeUnit)}
            detail={
              todayTotals.entries === 0
                ? 'Nothing logged yet'
                : `${todayTotals.entries} ${pluralize(todayTotals.entries, 'entry', 'entries')}`
            }
          />
          <StatCard
            label="This week"
            value={formatIntake(weekIntake, settings.intakeUnit)}
            detail={weekTotals.spend > 0 ? formatMoney(weekTotals.spend, settings.currency, { compact: true }) : undefined}
          />
        </View>

        <StreakCard streak={streak} longest={longestStreak} />

        <Card style={{ gap: theme.spacing(3) }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text variant="heading">Last 7 days</Text>
            <Text variant="caption" tone="muted">
              {settings.intakeUnit === 'grams' ? 'grams of alcohol' : 'standard drinks'}
            </Text>
          </View>
          <BarChart data={lastSevenDays} height={132} />
        </Card>

        <Card style={{ gap: theme.spacing(1) }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: theme.spacing(1),
            }}
          >
            <Text variant="heading">Today's log</Text>
            {todayEntries.length > 0 ? (
              <Text variant="caption" tone="muted">
                {todayEntries.length} {pluralize(todayEntries.length, 'entry', 'entries')}
              </Text>
            ) : null}
          </View>

          {todayEntries.length === 0 ? (
            <Text variant="body" tone="muted">
              Nothing logged today. That's just information, not a verdict.
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
