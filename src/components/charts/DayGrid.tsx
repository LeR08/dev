import React from 'react';
import { View } from 'react-native';

import type { DayFlag } from '@/domain/stats';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '../ui/Text';

export type DayGridProps = {
  days: DayFlag[];
  /** Weekday initials above the grid, for calendar-style layouts. */
  weekdayLabels?: string[];
  columns?: number;
};

/**
 * Dot grid of drinking / alcohol-free days.
 *
 * Alcohol-free days are filled in the accent colour: the positive state is the
 * one that gets the ink. Days with a drink are a neutral outline, never a
 * warning colour.
 *
 * Cells are sized by percentage width with inner padding rather than `gap`, so
 * a row of seven always fits exactly across any screen width.
 */
export function DayGrid({ days, weekdayLabels = [], columns = 7 }: DayGridProps) {
  const theme = useTheme();
  const cellWidth = `${100 / columns}%` as const;
  const inset = theme.spacing(0.75);

  return (
    <View>
      {weekdayLabels.length > 0 ? (
        <View style={{ flexDirection: 'row', marginBottom: theme.spacing(1) }}>
          {weekdayLabels.map((label, index) => (
            <View key={`${label}-${index}`} style={{ width: cellWidth, alignItems: 'center' }}>
              <Text variant="caption" tone="faint">
                {label}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {days.map((day) => {
          const free = day.elapsed && !day.hasDrink;
          return (
            <View key={day.key} style={{ width: cellWidth, padding: inset }}>
              <View
                accessibilityLabel={`${day.key}: ${
                  !day.elapsed ? 'upcoming' : day.hasDrink ? 'drink logged' : 'alcohol-free'
                }`}
                style={{
                  aspectRatio: 1,
                  borderRadius: theme.radius.sm,
                  backgroundColor: free
                    ? theme.accent.base
                    : day.hasDrink
                      ? theme.colors.surfaceMuted
                      : 'transparent',
                  borderWidth: 1,
                  borderColor: day.hasDrink ? theme.colors.border : theme.colors.trackEmpty,
                  borderStyle: day.elapsed ? 'solid' : 'dashed',
                  opacity: day.elapsed ? 1 : 0.5,
                }}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}
