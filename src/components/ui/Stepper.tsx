import * as Haptics from 'expo-haptics';
import React from 'react';
import { Platform, Pressable, View } from 'react-native';

import { useTranslation } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';

export type StepperProps = {
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  format?: (value: number) => string;
  label?: string;
};

/** Plus/minus control for quantities and volumes — the fast path when logging. */
export function Stepper({
  value,
  onChange,
  step = 1,
  min = step,
  max = 99,
  format = (v) => `${v}`,
  label,
}: StepperProps) {
  const theme = useTheme();
  const { t } = useTranslation();

  const change = (delta: number) => {
    const next = Math.min(max, Math.max(min, Number((value + delta).toFixed(2))));
    if (next === value) return;
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync().catch(() => {});
    }
    onChange(next);
  };

  const button = (symbol: string, delta: number, accessibilityLabel: string) => {
    const disabled = delta < 0 ? value <= min : value >= max;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        disabled={disabled}
        onPress={() => change(delta)}
        style={({ pressed }) => ({
          width: 44,
          height: 44,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: theme.radius.pill,
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.border,
          opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
        })}
      >
        <Text variant="heading">{symbol}</Text>
      </Pressable>
    );
  };

  return (
    <View style={{ gap: theme.spacing(1.5) }}>
      {label ? (
        <Text variant="caption" tone="muted" overline>
          {label}
        </Text>
      ) : null}
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
        {button('−', -step, t('stepper.decrease'))}
        <Text variant="heading">{format(value)}</Text>
        {button('+', step, t('stepper.increase'))}
      </View>
    </View>
  );
}
