import React from 'react';
import { View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Card } from './ui/Card';
import { sizeForLength } from './ui/autoSize';
import { Text } from './ui/Text';

/**
 * These cards sit two-up on the narrowest screen, so the metric size that
 * suits "5" overflows "0 standard drinks" badly enough that the line-breaker
 * splits the word itself. Stepping the size down by length keeps every real
 * value whole.
 */
const VALUE_SIZES = [
  { upTo: 6, fontSize: 30, lineHeight: 35 },
  { upTo: 10, fontSize: 25, lineHeight: 30 },
  { upTo: 16, fontSize: 21, lineHeight: 26 },
  { upTo: Infinity, fontSize: 18, lineHeight: 23 },
];

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
      <Text variant="caption" tone="muted" overline numberOfLines={2}>
        {label}
      </Text>
      <Text variant="metric" numberOfLines={3} style={sizeForLength(value, VALUE_SIZES)}>
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
