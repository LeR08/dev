import React from 'react';
import { View } from 'react-native';

import { streakHeadline, streakSubtitle } from '@/domain/encouragement';
import { useTranslation } from '@/i18n/I18nProvider';
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
  const { t } = useTranslation();
  const headline = streakHeadline(streak);
  const subtitle = streakSubtitle(streak);

  return (
    <Card tone="accent" style={{ gap: theme.spacing(1) }}>
      <Text variant="caption" tone="accent" overline>
        {t('today.streakLabel')}
      </Text>
      <Text variant="title">{t(headline.key as never, headline.params)}</Text>
      <Text variant="body" tone="muted">
        {t(subtitle.key as never, subtitle.params)}
      </Text>
      {longest > 0 && longest >= streak ? (
        <View style={{ marginTop: theme.spacing(1) }}>
          <Text variant="caption" tone="faint">
            {t('today.longestRun', { count: longest })}
          </Text>
        </View>
      ) : null}
    </Card>
  );
}
