import React from 'react';
import { Pressable, View } from 'react-native';

import { entryGrams, gramsToIntake } from '@/domain/alcohol';
import { formatAbv, formatMoney, formatTime, formatVolume } from '@/domain/format';
import type { Entry, Settings } from '@/domain/types';
import { formatIntakeLabel } from '@/i18n/formatIntakeLabel';
import { useTranslation } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './ui/Text';

export type EntryRowProps = {
  entry: Entry;
  settings: Settings;
  onPress?: () => void;
};

export function EntryRow({ entry, settings, onPress }: EntryRowProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const grams = entryGrams(entry);
  const intake = gramsToIntake(grams, settings.intakeUnit, settings.standardDrinkGrams);

  const details = [
    entry.quantity > 1 ? `×${entry.quantity}` : null,
    formatVolume(entry.volumeMl, settings.volumeUnit),
    formatAbv(entry.abv),
  ]
    .filter(Boolean)
    .join(' · ');

  const meta = [entry.location, entry.note].filter(Boolean).join(' — ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${entry.name}, ${details}`}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing(3),
        paddingVertical: theme.spacing(3),
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <View
        style={{
          width: 6,
          alignSelf: 'stretch',
          minHeight: 38,
          borderRadius: 3,
          backgroundColor: theme.categoryColor(entry.category),
        }}
      />

      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="body" numberOfLines={1}>
          {entry.name}
        </Text>
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {formatTime(entry.consumedAt)} · {details}
        </Text>
        {meta ? (
          <Text variant="caption" tone="faint" numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>

      <View style={{ alignItems: 'flex-end', gap: 2 }}>
        <Text variant="label">{formatIntakeLabel(t, intake, settings.intakeUnit)}</Text>
        {entry.price !== null ? (
          <Text variant="caption" tone="muted">
            {formatMoney(entry.price, settings.currency)}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
