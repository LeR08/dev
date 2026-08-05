import React from 'react';
import { Pressable, Switch, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';

export type RowProps = {
  title: string;
  subtitle?: string;
  /** Right-hand value text, e.g. the current setting. */
  value?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  left?: React.ReactNode;
  /** Renders the title in the accent colour — for destructive-ish actions. */
  emphasis?: boolean;
  style?: ViewStyle;
};

export function Row({ title, subtitle, value, onPress, right, left, emphasis, style }: RowProps) {
  const theme = useTheme();

  const body = (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing(3),
          paddingVertical: theme.spacing(3.5),
        },
        style,
      ]}
    >
      {left}
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="body" tone={emphasis ? 'accent' : 'default'}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" tone="muted">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text variant="label" tone="muted">
          {value}
        </Text>
      ) : null}
      {right}
      {onPress && !right ? (
        <Text variant="body" tone="faint">
          ›
        </Text>
      ) : null}
    </View>
  );

  if (!onPress) return body;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      {body}
    </Pressable>
  );
}

/** Hairline between rows inside a card. */
export function RowDivider() {
  const theme = useTheme();
  return <View style={{ height: 1, backgroundColor: theme.colors.border }} />;
}

export type ToggleRowProps = {
  title: string;
  subtitle?: string;
  value: boolean;
  onChange: (value: boolean) => void;
};

export function ToggleRow({ title, subtitle, value, onChange }: ToggleRowProps) {
  const theme = useTheme();
  return (
    <Row
      title={title}
      subtitle={subtitle}
      right={
        <Switch
          value={value}
          onValueChange={onChange}
          trackColor={{ true: theme.accent.base, false: theme.colors.trackEmpty }}
          thumbColor={theme.colors.surface}
          ios_backgroundColor={theme.colors.trackEmpty}
        />
      }
    />
  );
}
