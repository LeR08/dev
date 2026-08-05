import React from 'react';
import { View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Card } from './ui/Card';
import { Text } from './ui/Text';

export type StatCardProps = {
  label: string;
  value: string;
  /** Secondary line, e.g. "+12% vs last week". Never framed as good or bad. */
  detail?: string;
  style?: ViewStyle;
};

export function StatCard({ label, value, detail, style }: StatCardProps) {
  const theme = useTheme();

  return (
    <Card style={[{ flex: 1, minWidth: 140, gap: theme.spacing(1) }, style]}>
      <Text variant="caption" tone="muted" overline numberOfLines={1}>
        {label}
      </Text>
      <Text variant="metric" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {value}
      </Text>
      {detail ? (
        <Text variant="caption" tone="faint" numberOfLines={2}>
          {detail}
        </Text>
      ) : null}
    </Card>
  );
}
