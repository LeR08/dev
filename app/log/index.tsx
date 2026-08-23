import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, View } from 'react-native';

import { Chip } from '@/components/ui/Chip';
import { Field } from '@/components/ui/Field';
import { Text } from '@/components/ui/Text';
import { formatAbv, formatVolume } from '@/domain/format';
import { searchDrinks, type DrinkFilter } from '@/domain/search';
import { CATEGORIES, type Drink } from '@/domain/types';
import { useQuickLog } from '@/hooks/useQuickLog';
import { categoryLabel } from '@/i18n/categoryLabel';
import { catalogDrinkName } from '@/i18n/catalogNames';
import { useTranslation } from '@/i18n/I18nProvider';
import { useApp } from '@/state/AppProvider';
import { useTheme } from '@/theme/ThemeProvider';

export default function DrinkPickerScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t, language } = useTranslation();
  const { drinks, settings } = useApp();
  const quickLog = useQuickLog();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<DrinkFilter>('all');

  const results = useMemo(() => searchDrinks(drinks, query, filter), [drinks, filter, query]);

  const filters: { value: DrinkFilter; label: string }[] = [
    { value: 'all', label: t('logScreen.filterAll') },
    { value: 'mine', label: t('nav.myDrinks') },
    ...CATEGORIES.map((category) => ({ value: category as DrinkFilter, label: categoryLabel(t, category) })),
  ];

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{ paddingHorizontal: theme.spacing(5), paddingTop: theme.spacing(3), gap: theme.spacing(3) }}>
        <Field
          placeholder={t('logScreen.searchPlaceholder')}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          accessibilityLabel={t('common.searchDrinks')}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: theme.spacing(2), paddingRight: theme.spacing(5) }}
        >
          {filters.map((item) => (
            <Chip
              key={item.value}
              label={item.label}
              selected={filter === item.value}
              onPress={() => setFilter(item.value)}
            />
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={results}
        keyExtractor={(drink) => drink.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: theme.spacing(5),
          paddingTop: theme.spacing(3),
          paddingBottom: theme.spacing(12),
        }}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: theme.colors.border }} />}
        ListHeaderComponent={
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/drinks/edit')}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing(3),
              paddingVertical: theme.spacing(3.5),
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.accent.soft,
              }}
            >
              <Text variant="heading" tone="accent">
                +
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="body">{t('logScreen.createCustomTitle')}</Text>
              <Text variant="caption" tone="muted">
                {t('logScreen.createCustomSubtitle')}
              </Text>
            </View>
          </Pressable>
        }
        ListEmptyComponent={
          <View style={{ paddingVertical: theme.spacing(10), gap: theme.spacing(2) }}>
            <Text variant="heading" center>
              {t('logScreen.noMatchTitle')}
            </Text>
            <Text variant="body" tone="muted" center>
              {t('logScreen.noMatchBody', { query })}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <DrinkPickerRow
            drink={item}
            displayName={catalogDrinkName(language, item)}
            volumeLabel={`${formatVolume(item.defaultVolumeMl, settings.volumeUnit)} · ${formatAbv(item.abv)}`}
            yoursLabel={t('logScreen.yours')}
            rowA11yHint={t('logScreen.rowA11yHint')}
            onPress={() =>
              router.push({ pathname: '/log/details', params: { drinkId: item.id } })
            }
            onLongPress={() => {
              quickLog(item);
              router.back();
            }}
          />
        )}
      />
    </View>
  );
}

function DrinkPickerRow({
  drink,
  displayName,
  volumeLabel,
  yoursLabel,
  rowA11yHint,
  onPress,
  onLongPress,
}: {
  drink: Drink;
  displayName: string;
  volumeLabel: string;
  yoursLabel: string;
  rowA11yHint: string;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={rowA11yHint}
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing(3),
        paddingVertical: theme.spacing(3.5),
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <View
        style={{
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: theme.categoryColor(drink.category),
        }}
      />
      <View style={{ flex: 1 }}>
        <Text variant="body" numberOfLines={1}>
          {displayName}
        </Text>
        <Text variant="caption" tone="muted">
          {volumeLabel}
          {drink.isCustom ? ` · ${yoursLabel}` : ''}
        </Text>
      </View>
      <Text variant="body" tone="faint">
        ›
      </Text>
    </Pressable>
  );
}
