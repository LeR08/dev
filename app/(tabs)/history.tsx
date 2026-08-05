import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ScrollView, SectionList, View } from 'react-native';

import { EntryRow } from '@/components/EntryRow';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { FadeInView } from '@/components/ui/FadeInView';
import { Field } from '@/components/ui/Field';
import { Text } from '@/components/ui/Text';
import { gramsToIntake } from '@/domain/alcohol';
import { dayKey, startOfDay, trailingRange, type Range } from '@/domain/dates';
import { formatIntake, formatMoney, formatRelativeDay } from '@/domain/format';
import { filterEntries } from '@/domain/search';
import { totals } from '@/domain/stats';
import { CATEGORIES, CATEGORY_LABELS, type Category, type Entry } from '@/domain/types';
import { useNow } from '@/hooks/useNow';
import { useApp } from '@/state/AppProvider';
import { useTheme } from '@/theme/ThemeProvider';

type Period = 'all' | '30d' | '90d' | '365d';

const PERIODS: { value: Period; label: string; days: number | null }[] = [
  { value: '30d', label: '30 days', days: 30 },
  { value: '90d', label: '3 months', days: 90 },
  { value: '365d', label: 'Year', days: 365 },
  { value: 'all', label: 'All time', days: null },
];

export default function HistoryScreen() {
  const theme = useTheme();
  const router = useRouter();
  const now = useNow();
  const { entries, settings } = useApp();

  const [query, setQuery] = useState('');
  const [period, setPeriod] = useState<Period>('30d');
  const [category, setCategory] = useState<Category | 'all'>('all');

  const range = useMemo<Range | null>(() => {
    const days = PERIODS.find((item) => item.value === period)?.days ?? null;
    if (days === null) return null;
    return trailingRange(now, 'day', days, settings.weekStartsOn);
  }, [now, period, settings.weekStartsOn]);

  const filtered = useMemo(
    () => filterEntries(entries, { range, category, query }),
    [category, entries, query, range]
  );

  const sections = useMemo(() => groupByDay(filtered), [filtered]);
  const summary = useMemo(() => totals(filtered), [filtered]);
  const summaryIntake = gramsToIntake(summary.grams, settings.intakeUnit, settings.standardDrinkGrams);

  const hasFilters = query.trim().length > 0 || category !== 'all' || period !== 'all';

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <SectionList
        sections={sections}
        keyExtractor={(entry) => entry.id}
        stickySectionHeadersEnabled={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: theme.spacing(5),
          paddingBottom: theme.spacing(12),
          maxWidth: 560,
          width: '100%',
          alignSelf: 'center',
        }}
        ListHeaderComponent={
          <FadeInView>
            <View style={{ gap: theme.spacing(3), paddingTop: theme.spacing(8), paddingBottom: theme.spacing(3) }}>
              <Text variant="title">History</Text>

              <Field
                placeholder="Search names, notes, places…"
                value={query}
                onChangeText={setQuery}
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="Search your log"
              />

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: theme.spacing(2), paddingRight: theme.spacing(5) }}
              >
                {PERIODS.map((item) => (
                  <Chip
                    key={item.value}
                    label={item.label}
                    selected={period === item.value}
                    onPress={() => setPeriod(item.value)}
                  />
                ))}
              </ScrollView>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: theme.spacing(2), paddingRight: theme.spacing(5) }}
              >
                <Chip label="All drinks" selected={category === 'all'} onPress={() => setCategory('all')} />
                {CATEGORIES.map((item) => (
                  <Chip
                    key={item}
                    label={CATEGORY_LABELS[item]}
                    dotColor={theme.categoryColor(item)}
                    selected={category === item}
                    onPress={() => setCategory(item)}
                  />
                ))}
              </ScrollView>

              {filtered.length > 0 ? (
                <Text variant="caption" tone="muted">
                  {summary.entries} entries · {formatIntake(summaryIntake, settings.intakeUnit)}
                  {summary.spend > 0 ? ` · ${formatMoney(summary.spend, settings.currency, { compact: true })}` : ''}
                </Text>
              ) : null}
            </View>
          </FadeInView>
        }
        ListEmptyComponent={
          hasFilters && entries.length > 0 ? (
            <EmptyState
              title="Nothing matches"
              body="Try a wider date range or a different category."
              glyph="⌕"
            />
          ) : (
            <EmptyState
              title="Your log is empty"
              body="Whatever you log stays on this device. Start whenever you like."
              actionLabel="Log a drink"
              onAction={() => router.push('/log')}
              glyph="◌"
            />
          )
        }
        renderSectionHeader={({ section }) => (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              paddingTop: theme.spacing(4),
              paddingBottom: theme.spacing(1),
            }}
          >
            <Text variant="label" tone="muted">
              {formatRelativeDay(section.date, now)}
            </Text>
            <Text variant="caption" tone="faint">
              {formatIntake(
                gramsToIntake(section.grams, settings.intakeUnit, settings.standardDrinkGrams),
                settings.intakeUnit
              )}
              {section.spend > 0 ? ` · ${formatMoney(section.spend, settings.currency, { compact: true })}` : ''}
            </Text>
          </View>
        )}
        renderItem={({ item, index, section }) => (
          <View>
            {index > 0 ? <View style={{ height: 1, backgroundColor: theme.colors.border }} /> : null}
            <EntryRow
              entry={item}
              settings={settings}
              onPress={() => router.push({ pathname: '/entry/[id]', params: { id: item.id } })}
            />
          </View>
        )}
      />
    </View>
  );
}

type DaySection = {
  key: string;
  date: number;
  grams: number;
  spend: number;
  data: Entry[];
};

function groupByDay(entries: Entry[]): DaySection[] {
  const sections = new Map<string, DaySection>();

  for (const entry of entries) {
    const key = dayKey(entry.consumedAt);
    let section = sections.get(key);
    if (!section) {
      section = { key, date: startOfDay(entry.consumedAt).getTime(), grams: 0, spend: 0, data: [] };
      sections.set(key, section);
    }
    section.data.push(entry);
    section.spend += entry.price ?? 0;
  }

  // Day totals reuse the shared aggregation so the header can never disagree
  // with the dashboard.
  for (const section of sections.values()) {
    section.grams = totals(section.data).grams;
  }

  return [...sections.values()].sort((a, b) => b.date - a.date);
}
