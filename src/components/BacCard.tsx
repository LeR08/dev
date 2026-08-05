import React from 'react';
import { View } from 'react-native';

import { estimateBac } from '@/domain/bac';
import type { Entry, Profile } from '@/domain/types';
import { useTranslation } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { Card } from './ui/Card';
import { Text } from './ui/Text';

export type BacCardProps = {
  profile: Profile | null;
  entries: Entry[];
  now?: number;
};

/**
 * Compact, low-key BAC estimate for the home screen.
 *
 * Stays invisible whenever the estimate would be uninformative: no profile,
 * missing sex/weight (per spec v1.2 §4.1, never guessed), or nothing logged
 * in the current session. When it does show, it is plain text with no colour
 * coding — consistent with the "no red numbers, no warning colours" rule
 * that governs every consumption-adjacent screen in this app.
 */
export function BacCard({ profile, entries, now = Date.now() }: BacCardProps) {
  const theme = useTheme();
  const { t } = useTranslation();

  const estimate = estimateBac(profile, entries, now);
  if (!estimate || estimate.sessionGrams <= 0) return null;

  return (
    <Card style={{ gap: theme.spacing(1) }}>
      <Text variant="caption" tone="muted" overline>
        {t('bac.title')}
      </Text>
      <Text variant="metric">{estimate.sober ? '0.0‰' : `${estimate.bac.toFixed(2)}‰`}</Text>
      <View>
        <Text variant="caption" tone="faint">
          {estimate.sober ? t('bac.soberNote') : t('bac.disclaimer')}
        </Text>
      </View>
    </Card>
  );
}
