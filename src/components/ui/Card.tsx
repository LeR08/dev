import React from 'react';
import { Platform, View, type ViewProps, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

export type CardProps = ViewProps & {
  padded?: boolean;
  /** Tinted with the accent colour — used for the streak card. */
  tone?: 'surface' | 'accent' | 'muted';
};

export function Card({ padded = true, tone = 'surface', style, ...rest }: CardProps) {
  const theme = useTheme();

  const background: Record<NonNullable<CardProps['tone']>, string> = {
    surface: theme.colors.surface,
    accent: theme.accent.soft,
    muted: theme.colors.surfaceMuted,
  };

  const elevation: ViewStyle =
    Platform.OS === 'web'
      ? ({ boxShadow: `0 1px 2px ${theme.colors.shadow}` } as unknown as ViewStyle)
      : {
          shadowColor: theme.colors.shadow,
          shadowOpacity: theme.mode === 'light' ? 1 : 0.6,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 2 },
          elevation: 1,
        };

  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: background[tone],
          borderRadius: theme.radius.lg,
          borderWidth: tone === 'surface' ? 1 : 0,
          borderColor: theme.colors.border,
          padding: padded ? theme.spacing(4) : 0,
        },
        tone === 'surface' && elevation,
        style,
      ]}
    />
  );
}
