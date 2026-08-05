import React from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Button } from './Button';
import { Text } from './Text';

export type EmptyStateProps = {
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Decorative glyph. Kept text-based to avoid shipping icon assets. */
  glyph?: string;
};

export function EmptyState({ title, body, actionLabel, onAction, glyph = '◌' }: EmptyStateProps) {
  const theme = useTheme();

  return (
    <View
      style={{
        alignItems: 'center',
        gap: theme.spacing(2),
        paddingVertical: theme.spacing(10),
        paddingHorizontal: theme.spacing(4),
      }}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.accent.soft,
          marginBottom: theme.spacing(1),
        }}
      >
        <Text variant="title" tone="accent">
          {glyph}
        </Text>
      </View>
      <Text variant="heading" center>
        {title}
      </Text>
      {body ? (
        <Text variant="body" tone="muted" center>
          {body}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} style={{ marginTop: theme.spacing(2) }} />
      ) : null}
    </View>
  );
}
