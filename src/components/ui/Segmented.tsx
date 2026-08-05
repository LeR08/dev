import React from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';

export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
};

export type SegmentedProps<T extends string> = {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: ViewStyle;
};

/** Compact tab switch for day/week/month and similar small choices. */
export function Segmented<T extends string>({ options, value, onChange, style }: SegmentedProps<T>) {
  const theme = useTheme();

  return (
    <View
      accessibilityRole="tablist"
      style={[
        {
          flexDirection: 'row',
          backgroundColor: theme.colors.surfaceMuted,
          borderRadius: theme.radius.pill,
          borderWidth: 1,
          borderColor: theme.colors.border,
          padding: theme.spacing(0.75),
          gap: theme.spacing(0.75),
        },
        style,
      ]}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => ({
              flex: 1,
              alignItems: 'center',
              paddingVertical: theme.spacing(2),
              borderRadius: theme.radius.pill,
              backgroundColor: selected ? theme.colors.surface : 'transparent',
              opacity: pressed && !selected ? 0.6 : 1,
            })}
          >
            <Text variant="label" tone={selected ? 'default' : 'muted'}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
