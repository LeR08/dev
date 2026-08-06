import React, { useMemo, useState } from 'react';
import { FlatList, TextInput, View } from 'react-native';

import { Field } from '@/components/ui/Field';
import { Text } from '@/components/ui/Text';
import { currencySymbol, formatVolume } from '@/domain/format';
import { searchDrinks } from '@/domain/search';
import type { Drink } from '@/domain/types';
import { useTranslation } from '@/i18n/I18nProvider';
import { useApp } from '@/state/AppProvider';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * Default price per drink.
 *
 * Setting one here pre-fills the price field when logging that drink, which is
 * what makes the spending charts useful without typing a price every time.
 */
export default function PricesScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { drinks, settings, editDrink } = useApp();
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const matches = searchDrinks(drinks, query);
    if (query.trim().length > 0) return matches;
    // With no search, lead with the drinks that already have a price set.
    return [...matches].sort((a, b) => {
      const aPriced = a.defaultPrice !== null ? 0 : 1;
      const bPriced = b.defaultPrice !== null ? 0 : 1;
      return aPriced - bPriced;
    });
  }, [drinks, query]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{ paddingHorizontal: theme.spacing(5), paddingTop: theme.spacing(4), gap: theme.spacing(2) }}>
        <Text variant="caption" tone="faint">
          {t('pricesScreen.intro')}
        </Text>
        <Field
          placeholder={t('pricesScreen.searchPlaceholder')}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <FlatList
        data={results}
        keyExtractor={(drink) => drink.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: theme.spacing(5),
          paddingTop: theme.spacing(3),
          paddingBottom: theme.spacing(12),
          maxWidth: 560,
          width: '100%',
          alignSelf: 'center',
        }}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: theme.colors.border }} />}
        renderItem={({ item }) => (
          <PriceRow
            drink={item}
            currency={settings.currency}
            volumeLabel={formatVolume(item.defaultVolumeMl, settings.volumeUnit)}
            onSave={(price) => {
              if (price === item.defaultPrice) return;
              void editDrink(item.id, { defaultPrice: price });
            }}
          />
        )}
      />
    </View>
  );
}

function PriceRow({
  drink,
  currency,
  volumeLabel,
  onSave,
}: {
  drink: Drink;
  currency: string;
  volumeLabel: string;
  onSave: (price: number | null) => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [text, setText] = useState(drink.defaultPrice === null ? '' : `${drink.defaultPrice}`);

  const commit = () => {
    const normalized = text.replace(',', '.').trim();
    if (normalized === '') {
      onSave(null);
      return;
    }
    const value = Number(normalized);
    if (!Number.isFinite(value) || value < 0) {
      // Reject nonsense quietly and restore what was there.
      setText(drink.defaultPrice === null ? '' : `${drink.defaultPrice}`);
      return;
    }
    onSave(Number(value.toFixed(2)));
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing(3),
        paddingVertical: theme.spacing(3),
      }}
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
          {drink.name}
        </Text>
        <Text variant="caption" tone="muted">
          {volumeLabel}
        </Text>
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing(1),
          minWidth: 96,
          paddingHorizontal: theme.spacing(3),
          paddingVertical: theme.spacing(2),
          borderRadius: theme.radius.md,
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surfaceMuted,
        }}
      >
        <Text variant="label" tone="muted">
          {currencySymbol(currency)}
        </Text>
        <TextInput
          value={text}
          onChangeText={setText}
          onBlur={commit}
          onEndEditing={commit}
          keyboardType="decimal-pad"
          placeholder="—"
          placeholderTextColor={theme.colors.textFaint}
          accessibilityLabel={t('pricesScreen.priceA11y', { name: drink.name })}
          style={{
            flex: 1,
            color: theme.colors.text,
            fontSize: theme.type.body.fontSize,
            paddingVertical: 0,
            ...(({ outlineStyle: 'none' } as unknown) as object),
          }}
        />
      </View>
    </View>
  );
}
