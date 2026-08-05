import React from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';

export type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  /** Small colour dot, used for drink categories. */
  dotColor?: string;
  style?: ViewStyle;
};

export function Chip({ label, selected = false, onPress, dotColor, style }: ChipProps) {
  const theme = useTheme();

  const content = (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing(1.5),
          paddingVertical: theme.spacing(2),
          paddingHorizontal: theme.spacing(3.5),
          borderRadius: theme.radius.pill,
          backgroundColor: selected ? theme.accent.base : theme.colors.surfaceMuted,
          borderWidth: 1,
          borderColor: selected ? theme.accent.base : theme.colors.border,
        },
        style,
      ]}
    >
      {dotColor ? (
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: selected ? theme.accent.onBase : dotColor,
          }}
        />
      ) : null}
      <Text variant="label" tone={selected ? 'onAccent' : 'muted'}>
        {label}
      </Text>
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
    >
      {content}
    </Pressable>
  );
}
