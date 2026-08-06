import React, { useRef } from 'react';
import { Animated, Pressable } from 'react-native';

import { useTranslation } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { USE_NATIVE_DRIVER } from './animation';
import { Icon } from './Icon';
import { Text } from './Text';

/** Short on-pill label per language — codes for Latin-script languages, the
 *  language's own name for Chinese and Arabic since "ZH"/"AR" mean little to
 *  someone reading those scripts. */
const PILL_LABEL: Record<string, string> = {
  en: 'EN',
  fr: 'FR',
  es: 'ES',
  de: 'DE',
  it: 'IT',
  pt: 'PT',
  zh: '中文',
  ar: 'عربي',
};

export type LanguagePillProps = {
  onPress: () => void;
};

/**
 * Small persistent "🌐 EN" chip that opens the language picker.
 *
 * Lives on the home screen (the most-visited one) so switching language is
 * always one tap away, rather than buried a few levels into Settings.
 */
export function LanguagePill({ onPress }: LanguagePillProps) {
  const theme = useTheme();
  const { language, t } = useTranslation();
  const scale = useRef(new Animated.Value(1)).current;

  const press = (toValue: number) => {
    Animated.spring(scale, { toValue, useNativeDriver: USE_NATIVE_DRIVER, speed: 40, bounciness: 4 }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('settings.language.changeA11y')}
        onPressIn={() => press(0.94)}
        onPressOut={() => press(1)}
        onPress={onPress}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing(1.5),
          paddingVertical: theme.spacing(1.5),
          paddingHorizontal: theme.spacing(3),
          borderRadius: theme.radius.pill,
          backgroundColor: theme.colors.surfaceMuted,
          borderWidth: 1,
          borderColor: theme.colors.border,
        }}
      >
        <Icon name="globe" size={15} color={theme.colors.textMuted} strokeWidth={1.6} />
        <Text variant="caption" tone="muted">
          {PILL_LABEL[language] ?? language.toUpperCase()}
        </Text>
      </Pressable>
    </Animated.View>
  );
}
