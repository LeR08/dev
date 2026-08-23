import React from 'react';
import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import type { Theme } from '@/theme/theme';

type Variant = keyof Theme['type'];
type Tone = 'default' | 'muted' | 'faint' | 'accent' | 'positive' | 'onAccent';

export type TextProps = RNTextProps & {
  variant?: Variant;
  tone?: Tone;
  /** Uppercase micro-label used above groups and stat values. */
  overline?: boolean;
  center?: boolean;
};

export function Text({
  variant = 'body',
  tone = 'default',
  overline = false,
  center = false,
  style,
  ...rest
}: TextProps) {
  const theme = useTheme();
  const tokens = theme.type[variant];

  const color: Record<Tone, string> = {
    default: theme.colors.text,
    muted: theme.colors.textMuted,
    faint: theme.colors.textFaint,
    accent: theme.accent.strong,
    positive: theme.colors.positive,
    onAccent: theme.accent.onBase,
  };

  const overlineStyle: TextStyle = overline
    ? { textTransform: 'uppercase', letterSpacing: 0.9, fontWeight: '600' }
    : {};

  return (
    <RNText
      {...rest}
      style={[tokens, { color: color[tone] }, overlineStyle, center && { textAlign: 'center' }, style]}
    />
  );
}
