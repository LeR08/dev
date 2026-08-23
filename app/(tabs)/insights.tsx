import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { BarChart, type BarDatum } from '@/components/charts/BarChart';
import { DayGrid } from '@/components/charts/DayGrid';
import { DonutChart, type DonutSlice } from '@/components/charts/DonutChart';
import { StatCard } from '@/components/StatCard';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { FadeInView } from '@/components/ui/FadeInView';
import { Screen } from '@/components/ui/Screen';
import { Segmented } from '@/components/ui/Segmented';
import { Text } from '@/components/ui/Text';
import { gramsToIntake } from '@/domain/alcohol';
import {
  addDays,
  eachDay,
  periodRange,
  previousRange,
  startOfWeek,
  trailingRange,
  type Granularity,
  type Range,
} from '@/domain/dates';
import { freeDaysStatus } from '@/domain/encouragement';
import {
  formatComparison,
  formatMoney,
  formatMonth,
  formatWeekdayShort,
  trimNumber,
  volumeInUnit,
  type ComparisonTemplates,
} from '@/domain/format';
import { computeSavings, savingsHeadline } from '@/domain/savings';
import {
  alcoholFreeDays,
  averagePerDay,
  bucketize,
  categoryTotals,
  compare,
  dayFlags,
  filterByRange,
  totals,
} from '@/domain/stats';
import { categoryLabel } from '@/i18n/categoryLabel';
import { formatIntakeLabel } from '@/i18n/formatIntakeLabel';
import { useNow } from '@/hooks/useNow';
import { useTranslation } from '@/i18n/I18nProvider';
import { useApp } from '@/state/AppProvider';
import { useTheme } from '@/theme/ThemeProvider';

type Window = 'day' | 'week' | 'month' | 'year';

const VIEWS: { value: Window; granularity: Granularity; count: number }[] = [
  { value: 'day', granularity: 'hour', count: 24 },
  { value: 'week', granularity: 'day', count: 7 },
  { value: 'month', granularity: 'day', count: 30 },
  { value: 'year', granularity: 'month', count: 12 },
];

const VIEW_LABEL_KEY: Record<Window, string> = {
  day: 'insights.day',
  week: 'insights.week',
  month: 'insights.month',
  year: 'insights.year',
};

export default function InsightsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const now = useNow();
  const { t } = useTranslation();
  const { entries, settings, profile } = useApp();
  const [view, setView] = useState<Window>('week');

  const config = VIEWS.find((item) => item.value === view) ?? VIEWS[0];

  // The day view tracks the calendar day (for a clean "today vs yesterday"
  // comparison) rather than a trailing 24h window like the other views use.
  const range = useMemo(
    () =>
      view === 'day'
        ? periodRange(now, 'day', settings.weekStartsOn)
        : trailingRange(now, config.granularity, config.count, settings.weekStartsOn),
    [config.count, config.granularity, now, settings.weekStartsOn, view]
  );

  /** The equally sized window immediately before this one. */
  const previous = useMemo<Range>(
    () =>
      view === 'day'
        ? previousRange(range, 'day', settings.weekStartsOn)
        : { start: range.start - (range.end - range.start), end: range.start },
    [range, settings.weekStartsOn, view]
  );

  const current = useMemo(() => filterByRange(entries, range), [entries, range]);
  const currentTotals = useMemo(() => totals(current), [current]);
  const previousTotals = useMemo(() => totals(filterByRange(entries, previous)), [entries, previous]);

  const buckets = useMemo(
    () => bucketize(entries, range, config.granularity, settings.weekStartsOn),
    [config.granularity, entries, range, settings.weekStartsOn]
  );

  const toIntake = (grams: number) =>
    gramsToIntake(grams, settings.intakeUnit, settings.standardDrinkGrams);

  // Plotted as volume (the user's own unit, cl by default) rather than
  // "standard drinks" or grams of alcohol — a concrete, unambiguous number on
  // the axis rather than an abstract intake-unit count.
  const intakeBars = useMemo<BarDatum[]>(
    () =>
      buckets.map((bucket, index) => ({
        key: bucket.key,
        label: bucketLabel(bucket.start, view, index, buckets.length),
        value: volumeInUnit(bucket.volumeMl, settings.volumeUnit),
        highlight: index === buckets.length - 1,
      })),
    [buckets, settings.volumeUnit, view]
  );

  const spendBars = useMemo<BarDatum[]>(
    () =>
      buckets.map((bucket, index) => ({
        key: bucket.key,
        label: bucketLabel(bucket.start, view, index, buckets.length),
        value: bucket.spend,
        highlight: index === buckets.length - 1,
      })),
    [buckets, view]
  );

  const categories = useMemo(() => categoryTotals(current), [current]);
  const slices = useMemo<DonutSlice[]>(
    () =>
      categories.map((item) => ({
        key: item.category,
        label: categoryLabel(t, item.category),
        value: item.grams,
        color: theme.categoryColor(item.category),
      })),
    [categories, t, theme]
  );

  const intakeComparison = compare(toIntake(currentTotals.grams), toIntake(previousTotals.grams));
  const spendComparison = compare(currentTotals.spend, previousTotals.spend);
  const perDay = useMemo(() => averagePerDay(entries, range, now), [entries, now, range]);
  const freeDays = useMemo(() => alcoholFreeDays(entries, range, now), [entries, now, range]);
  const elapsedDays = useMemo(
    () => dayFlags(entries, range, now).filter((day) => day.elapsed).length,
    [entries, now, range]
  );

  // The calendar strip always shows the running week, whatever the chart window.
  const weekRange = useMemo(
    () => periodRange(now, 'week', settings.weekStartsOn),
    [now, settings.weekStartsOn]
  );
  const weekDays = useMemo(() => dayFlags(entries, weekRange, now), [entries, now, weekRange]);
  const weekFreeDays = weekDays.filter((day) => day.elapsed && !day.hasDrink).length;
  const weekdayLabels = useMemo(() => {
    const start = startOfWeek(now, settings.weekStartsOn);
    return eachDay(start, addDays(start, 7)).map((day) => formatWeekdayShort(day));
  }, [now, settings.weekStartsOn]);

  // A daily share of the weekly goal — the weekly figure divided evenly across
  // 7 days, since there's no separate "daily goal" setting. Shown against
  // today's own intake in the Day view (spec follow-up: "plus de données par
  // rapport à l'objectif journalier").
  const dailyGoalIntake = settings.goals.weeklyIntake !== null ? settings.goals.weeklyIntake / 7 : null;
  const todayIntakeForGoal = toIntake(currentTotals.grams);
  const dailyGoal = dailyGoalIntake !== null && dailyGoalIntake > 0 ? { goal: dailyGoalIntake } : null;
  const dailyGoalFraction = dailyGoal ? Math.min(1, todayIntakeForGoal / dailyGoal.goal) : null;
  const dailyGoalRemaining = dailyGoal ? dailyGoal.goal - todayIntakeForGoal : 0;

  const periodName =
    view === 'day'
      ? t('insights.periodDayBefore')
      : view === 'week'
        ? t('insights.periodPrevious7Days')
        : view === 'month'
          ? t('insights.periodPrevious30Days')
          : t('insights.periodPreviousYear');

  const comparisonTemplates: ComparisonTemplates = {
    nothingLoggedIn: t('insights.cmpNothingLoggedIn'),
    nothingEither: t('insights.cmpNothingEither'),
    vsPeriod: t('insights.cmpVsPeriod'),
    sameLabel: t('common.aboutTheSame'),
  };

  const savings = useMemo(
    () => computeSavings(profile?.spendBeforeTrackingPerDay ?? null, entries, range),
    [entries, profile?.spendBeforeTrackingPerDay, range]
  );

  const showTodayEmptyNotice = view === 'day' && current.length === 0;

  if (entries.length === 0) {
    return (
      <Screen>
        <View style={{ paddingTop: theme.spacing(8) }}>
          <Text variant="title">{t('insights.title')}</Text>
        </View>
        <EmptyState title={t('insights.emptyTitle')} body={t('insights.emptyBody')} glyph="◔" />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ gap: theme.spacing(3), paddingTop: theme.spacing(8), paddingBottom: theme.spacing(4) }}>
        <Text variant="title">{t('insights.title')}</Text>
        <Segmented
          options={VIEWS.map((item) => ({ value: item.value, label: t(VIEW_LABEL_KEY[item.value] as never) }))}
          value={view}
          onChange={setView}
        />
      </View>

      <View style={{ gap: theme.spacing(4) }}>
        <FadeInView delay={0}>
          <View style={{ flexDirection: 'row', gap: theme.spacing(3) }}>
            <StatCard
              label={
                view === 'day'
                  ? t('insights.todayStats')
                  : view === 'year'
                    ? t('insights.thisYear')
                    : view === 'month'
                      ? t('insights.last30Days')
                      : t('today.last7Days')
              }
              value={formatIntakeLabel(t, toIntake(currentTotals.grams), settings.intakeUnit)}
              detail={formatComparison(intakeComparison, periodName, comparisonTemplates)}
            />
            <StatCard
              label={t('insights.spent')}
              value={formatMoney(currentTotals.spend, settings.currency, { compact: true })}
              detail={formatComparison(spendComparison, periodName, comparisonTemplates)}
            />
          </View>
        </FadeInView>

        {!showTodayEmptyNotice ? (
          <FadeInView delay={40}>
            <View style={{ flexDirection: 'row', gap: theme.spacing(3) }}>
              <StatCard
                label={t('insights.averagePerDay')}
                value={formatIntakeLabel(t, toIntake(perDay), settings.intakeUnit)}
                detail={t('insights.acrossTrackedDays')}
              />
              <StatCard
                label={t('insights.alcoholFreeDays')}
                value={`${freeDays}`}
                detail={t(
                  elapsedDays === 1 ? ('insights.outOfTrackedOne' as never) : ('insights.outOfTrackedOther' as never),
                  { count: elapsedDays }
                )}
              />
            </View>
          </FadeInView>
        ) : null}

        {view === 'day' && dailyGoal ? (
          <FadeInView delay={60}>
            <Card style={{ gap: theme.spacing(2) }}>
              <Text variant="heading">{t('insights.dailyGoalTitle')}</Text>
              <View
                style={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: theme.colors.trackEmpty,
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    width: `${(dailyGoalFraction ?? 0) * 100}%`,
                    height: '100%',
                    backgroundColor: dailyGoalRemaining < 0 ? theme.colors.textMuted : theme.accent.base,
                  }}
                />
              </View>
              <Text variant="caption" tone="muted">
                {dailyGoalRemaining >= 0
                  ? t('insights.dailyGoalRemaining', {
                      remaining: formatIntakeLabel(t, dailyGoalRemaining, settings.intakeUnit),
                      goal: formatIntakeLabel(t, dailyGoal.goal, settings.intakeUnit),
                    })
                  : t('insights.dailyGoalOver', {
                      over: formatIntakeLabel(t, Math.abs(dailyGoalRemaining), settings.intakeUnit),
                      goal: formatIntakeLabel(t, dailyGoal.goal, settings.intakeUnit),
                    })}
              </Text>
            </Card>
          </FadeInView>
        ) : null}

        {showTodayEmptyNotice ? (
          <FadeInView delay={40}>
            <Card tone="muted" style={{ gap: theme.spacing(1) }}>
              <Text variant="heading">{t('insights.emptyTodayTitle')}</Text>
              <Text variant="body" tone="muted">
                {t('insights.emptyTodayBody')}
              </Text>
            </Card>
          </FadeInView>
        ) : (
          <FadeInView delay={80}>
            <Card style={{ gap: theme.spacing(3) }}>
              <View style={{ gap: 2 }}>
                <Text variant="heading">{t('insights.volumeLabel')}</Text>
                <Text variant="caption" tone="muted">
                  {view === 'day' ? t('insights.byHour') : view === 'year' ? t('insights.byMonth') : t('insights.byDay')}
                </Text>
              </View>
              <BarChart
                data={intakeBars}
                height={170}
                showYAxis
                yAxisWidth={52}
                formatValue={(value) => `${trimNumber(value, 1)} ${settings.volumeUnit}`}
              />
            </Card>
          </FadeInView>
        )}

        {!showTodayEmptyNotice ? (
          <FadeInView delay={120}>
            <Card style={{ gap: theme.spacing(3) }}>
              <View style={{ gap: 2 }}>
                <Text variant="heading">{t('insights.moneySpent')}</Text>
                <Text variant="caption" tone="muted">
                  {currentTotals.spend > 0
                    ? t('insights.spentInWindow', { amount: formatMoney(currentTotals.spend, settings.currency) })
                    : t('insights.addPricesHint')}
                </Text>
              </View>
              <BarChart
                data={spendBars}
                height={130}
                color={theme.colors.textMuted}
                showYAxis
                yAxisWidth={44}
                formatValue={(value) => formatMoney(value, settings.currency, { compact: true })}
              />
            </Card>
          </FadeInView>
        ) : null}

        <FadeInView delay={160}>
          <SavingsCard saved={savings?.saved ?? null} onPress={() => router.push('/savings')} />
        </FadeInView>

        {!showTodayEmptyNotice ? (
          <FadeInView delay={200}>
            <Card style={{ gap: theme.spacing(3) }}>
              <Text variant="heading">{t('insights.byCategory')}</Text>
              {slices.length === 0 ? (
                <Text variant="body" tone="muted">
                  {t('insights.nothingInWindow')}
                </Text>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing(4) }}>
                  <DonutChart
                    slices={slices}
                    centerValue={formatIntakeLabel(t, toIntake(currentTotals.grams), settings.intakeUnit)}
                    centerLabel={t('insights.totalLabel')}
                    size={150}
                  />
                  <View style={{ flex: 1, gap: theme.spacing(2) }}>
                    {categories.slice(0, 5).map((item) => (
                      <View
                        key={item.category}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing(2) }}
                      >
                        <View
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: 5,
                            backgroundColor: theme.categoryColor(item.category),
                          }}
                        />
                        <Text variant="label" style={{ flex: 1 }} numberOfLines={1}>
                          {categoryLabel(t, item.category)}
                        </Text>
                        <Text variant="caption" tone="muted">
                          {Math.round(item.share * 100)}%
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </Card>
          </FadeInView>
        ) : null}

        <FadeInView delay={240}>
          <Card style={{ gap: theme.spacing(3) }}>
            <View style={{ gap: 2 }}>
              <Text variant="heading">{t('insights.dayByDayTitle')}</Text>
              <Text variant="caption" tone="muted">
                {settings.goals.alcoholFreeDaysPerWeek !== null
                  ? (() => {
                      const status = freeDaysStatus(weekFreeDays, settings.goals.alcoholFreeDaysPerWeek);
                      return t(status.key as never, status.params);
                    })()
                  : t(
                      weekFreeDays === 1
                        ? ('insights.weekFreeDaysSoFarOne' as never)
                        : ('insights.weekFreeDaysSoFarOther' as never),
                      { count: weekFreeDays }
                    )}
              </Text>
            </View>
            <DayGrid days={weekDays} weekdayLabels={weekdayLabels} columns={7} />
            <Text variant="caption" tone="faint">
              {t('insights.freeSquaresHint')}
            </Text>
          </Card>
        </FadeInView>

        <FadeInView delay={280}>
          <Card style={{ gap: theme.spacing(2) }}>
            <Text variant="heading">{formatMonth(now)}</Text>
            <MonthGrid />
          </Card>
        </FadeInView>
      </View>
    </Screen>
  );
}

/**
 * Savings summary for the window Insights is already showing.
 *
 * Shown as a prompt to add a baseline when there is none (spec v1.2 §7.3),
 * rather than being hidden entirely — the dedicated Savings screen explains
 * why it is worth adding one.
 */
function SavingsCard({ saved, onPress }: { saved: number | null; onPress: () => void }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { settings } = useApp();

  if (saved === null) {
    return (
      <Card style={{ gap: theme.spacing(2) }}>
        <Text variant="heading">{t('savings.cardTitle')}</Text>
        <Text variant="body" tone="muted">
          {t('savings.noBaselinePrompt')}
        </Text>
        <Button label={t('savings.addBaselineAction')} variant="secondary" onPress={onPress} />
      </Card>
    );
  }

  const headline = savingsHeadline(saved);
  const label =
    headline === 'saved' ? t('savings.savedLabel') : headline === 'spentMore' ? t('savings.spentMoreLabel') : t('savings.evenLabel');

  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      <Card tone="accent" style={{ gap: theme.spacing(1) }}>
        <Text variant="caption" tone="accent" overline>
          {t('savings.cardTitle')}
        </Text>
        <Text variant="title">
          {formatMoney(Math.abs(saved), settings.currency)} {label}
        </Text>
        <Text variant="caption" tone="muted">
          {t('savings.disclaimerNeutral')}
        </Text>
      </Card>
    </Pressable>
  );
}

/** Calendar view of the running month, aligned to the user's week start. */
function MonthGrid() {
  const theme = useTheme();
  const now = useNow();
  const { t } = useTranslation();
  const { entries, settings } = useApp();

  const month = useMemo(() => periodRange(now, 'month', settings.weekStartsOn), [now, settings.weekStartsOn]);
  const days = useMemo(() => dayFlags(entries, month, now), [entries, month, now]);

  // Pad the first row so the 1st lands under the right weekday.
  const firstWeekday = new Date(month.start).getDay();
  const leading = (firstWeekday - settings.weekStartsOn + 7) % 7;
  const padded = [
    ...Array.from({ length: leading }, (_, index) => ({
      key: `pad-${index}`,
      start: 0,
      hasDrink: false,
      grams: 0,
      elapsed: false,
    })),
    ...days,
  ];

  const weekdayLabels = useMemo(() => {
    const start = startOfWeek(now, settings.weekStartsOn);
    return eachDay(start, addDays(start, 7)).map((day) => formatWeekdayShort(day));
  }, [now, settings.weekStartsOn]);

  const free = days.filter((day) => day.elapsed && !day.hasDrink).length;

  return (
    <View style={{ gap: theme.spacing(2) }}>
      <DayGrid days={padded} weekdayLabels={weekdayLabels} columns={7} />
      <Text variant="caption" tone="muted">
        {t(free === 1 ? ('insights.monthFreeDaysOne' as never) : ('insights.monthFreeDaysOther' as never), {
          count: free,
        })}
      </Text>
    </View>
  );
}

/** Keeps long axes readable by labelling only a few evenly spaced buckets. */
function bucketLabel(start: number, view: Window, index: number, count: number): string {
  if (view === 'year') {
    return new Date(start).toLocaleDateString(undefined, { month: 'narrow' });
  }
  if (view === 'week') {
    return formatWeekdayShort(start);
  }
  if (view === 'day') {
    const step = 3;
    if (index % step !== 0 && index !== count - 1) return '';
    return `${new Date(start).getHours()}h`;
  }
  const step = Math.ceil(count / 6);
  if (index % step !== 0 && index !== count - 1) return '';
  return `${new Date(start).getDate()}`;
}
