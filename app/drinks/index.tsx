import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { FlatList, Pressable, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Text } from '@/components/ui/Text';
import { formatAbv, formatMoney, formatVolume } from '@/domain/format';
import { categoryLabel } from '@/i18n/categoryLabel';
import { useTranslation } from '@/i18n/I18nProvider';
import { useApp } from '@/state/AppProvider';
import { useTheme } from '@/theme/ThemeProvider';

export default function MyDrinksScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { drinks, settings } = useApp();

  const custom = useMemo(() => drinks.filter((drink) => drink.isCustom), [drinks]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <FlatList
        data={custom}
        keyExtractor={(drink) => drink.id}
        contentContainerStyle={{
          paddingHorizontal: theme.spacing(5),
          paddingTop: theme.spacing(4),
          paddingBottom: theme.spacing(12),
          maxWidth: 560,
          width: '100%',
          alignSelf: 'center',
        }}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: theme.colors.border }} />}
        ListHeaderComponent={
          <View style={{ gap: theme.spacing(2), paddingBottom: theme.spacing(3) }}>
            <Text variant="body" tone="muted">
              {t('drinksScreen.intro')}
            </Text>
            <Button label={t('drinksScreen.newAction')} onPress={() => router.push('/drinks/edit')} />
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title={t('drinksScreen.emptyTitle')}
            body={t('drinksScreen.emptyBody')}
            glyph="+"
          />
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/drinks/edit', params: { id: item.id } })}
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
                backgroundColor: theme.categoryColor(item.category),
              }}
            />
            <View style={{ flex: 1 }}>
              <Text variant="body" numberOfLines={1}>
                {item.name}
              </Text>
              <Text variant="caption" tone="muted">
                {categoryLabel(t, item.category)} · {formatVolume(item.defaultVolumeMl, settings.volumeUnit)} ·{' '}
                {formatAbv(item.abv)}
                {item.defaultPrice !== null ? ` · ${formatMoney(item.defaultPrice, settings.currency)}` : ''}
              </Text>
            </View>
            <Text variant="body" tone="faint">
              ›
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}
