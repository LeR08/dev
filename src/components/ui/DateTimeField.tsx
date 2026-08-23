import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { addDays, sameDay, startOfDay } from '@/domain/dates';
import { formatRelativeDay } from '@/domain/format';
import { useTranslation } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { Field } from './Field';
import { Text } from './Text';

export type DateTimeFieldProps = {
  value: number;
  onChange: (value: number) => void;
  /** Latest allowed instant. Defaults to now — you cannot log the future. */
  max?: number;
};

/**
 * Date and time picker built from a day stepper and a plain time input.
 *
 * Deliberately not the native picker: the common case is "now" or "a bit
 * earlier", the two-arrow stepper handles that in one tap, and this behaves
 * identically on iOS, Android and the web build.
 */
export function DateTimeField({ value, onChange, max = Date.now() }: DateTimeFieldProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [timeText, setTimeText] = useState(() => toTimeText(value));

  useEffect(() => {
    setTimeText(toTimeText(value));
  }, [value]);

  const shiftDay = (days: number) => {
    const shifted = addDays(value, days);
    onChange(Math.min(shifted.getTime(), max));
  };

  const commitTime = (text: string) => {
    setTimeText(text);
    const match = /^(\d{1,2})[:hH.]?(\d{2})$/.exec(text.trim());
    if (!match) return;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours > 23 || minutes > 59) return;
    const next = new Date(value);
    next.setHours(hours, minutes, 0, 0);
    onChange(Math.min(next.getTime(), max));
  };

  const isToday = sameDay(value, max);
  const canGoForward = startOfDay(value).getTime() < startOfDay(max).getTime();

  const arrow = (symbol: string, days: number, label: string, disabled: boolean) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={() => shiftDay(days)}
      style={({ pressed }) => ({
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: theme.radius.pill,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        opacity: disabled ? 0.35 : pressed ? 0.6 : 1,
      })}
    >
      <Text variant="body">{symbol}</Text>
    </Pressable>
  );

  return (
    <View style={{ gap: theme.spacing(3) }}>
      <View style={{ gap: theme.spacing(1.5) }}>
        <Text variant="caption" tone="muted" overline>
          {t('dateTimeField.whenLabel')}
        </Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: theme.colors.surfaceMuted,
            borderRadius: theme.radius.pill,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing(1),
          }}
        >
          {arrow('‹', -1, t('dateTimeField.previousDay'), false)}
          <Text variant="label">
            {formatRelativeDay(value, max, { today: t('common.today'), yesterday: t('common.yesterday') })}
          </Text>
          {arrow('›', 1, t('dateTimeField.nextDay'), !canGoForward)}
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: theme.spacing(3), alignItems: 'flex-end' }}>
        <Field
          label={t('dateTimeField.timeLabel')}
          value={timeText}
          onChangeText={commitTime}
          placeholder="20:30"
          keyboardType="numbers-and-punctuation"
          maxLength={5}
          containerStyle={{ flex: 1 }}
          accessibilityLabel={t('dateTimeField.timeA11y')}
        />
        <Pressable
          accessibilityRole="button"
          onPress={() => onChange(max)}
          style={({ pressed }) => ({
            paddingVertical: theme.spacing(3.5),
            paddingHorizontal: theme.spacing(4),
            borderRadius: theme.radius.md,
            borderWidth: 1,
            borderColor: theme.colors.border,
            backgroundColor: isToday ? theme.colors.surfaceMuted : theme.colors.surface,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Text variant="label" tone="muted">
            {t('dateTimeField.nowAction')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function toTimeText(value: number): string {
  const date = new Date(value);
  return `${`${date.getHours()}`.padStart(2, '0')}:${`${date.getMinutes()}`.padStart(2, '0')}`;
}
