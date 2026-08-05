import React from 'react';
import { View } from 'react-native';

import { streakHeadline, streakSubtitle } from '@/domain/encouragement';
import { pluralize } from '@/domain/format';
import { useTheme } from '@/theme/ThemeProvider';
import { Card } from './ui/Card';
import { Text } from './ui/Text';

export type StreakCardProps = {
  streak: number;
  longest: number;
};

/** The one card that is allowed to be openly celebratory. */
export function StreakCard({ streak, longest }: StreakCardProps) {
  const theme = useTheme();

  return (
    <Card tone="accent" style={{ gap: theme.spacing(1) }}>
      <Text variant="caption" tone="accent" overline>
        Alcohol-free streak
      </Text>
      <Text variant="title">{streakHeadline(streak)}</Text>
      <Text variant="body" tone="muted">
        {streakSubtitle(streak)}
      </Text>
      {longest > 0 && longest >= streak ? (
        <View style={{ marginTop: theme.spacing(1) }}>
          <Text variant="caption" tone="faint">
            Your longest run so far: {longest} {pluralize(longest, 'day')}
          </Text>
        </View>
      ) : null}
    </Card>
  );
}
