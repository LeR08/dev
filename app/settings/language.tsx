import React, { useRef } from 'react';
import { Animated, Pressable, View } from 'react-native';

import { FadeInView } from '@/components/ui/FadeInView';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { USE_NATIVE_DRIVER } from '@/components/ui/animation';
import { LANGUAGES, type LanguageCode } from '@/domain/types';
import { LANGUAGE_NAMES } from '@/i18n';
import { useTranslation } from '@/i18n/I18nProvider';
import { useApp } from '@/state/AppProvider';
import { useTheme } from '@/theme/ThemeProvider';

export default function LanguageScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { settings, updateSettings } = useApp();

  return (
    <Screen>
      <View style={{ gap: theme.spacing(5), paddingTop: theme.spacing(4) }}>
        <Text variant="body" tone="muted">
          {t('settings.language.intro')}
        </Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing(3) }}>
          {LANGUAGES.map((language, index) => (
            <FadeInView key={language} delay={index * 40} distance={8} style={{ width: '47%' }}>
              <LanguageCard
                language={language}
                selected={settings.language === language}
                onPress={() => updateSettings({ language })}
              />
            </FadeInView>
          ))}
        </View>
      </View>
    </Screen>
  );
}

function LanguageCard({
  language,
  selected,
  onPress,
}: {
  language: LanguageCode;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  const press = (toValue: number) => {
    Animated.spring(scale, { toValue, useNativeDriver: USE_NATIVE_DRIVER, speed: 30, bounciness: 5 }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected }}
        onPressIn={() => press(0.96)}
        onPressOut={() => press(1)}
        onPress={onPress}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: theme.spacing(2),
          paddingVertical: theme.spacing(4),
          paddingHorizontal: theme.spacing(4),
          borderRadius: theme.radius.lg,
          backgroundColor: selected ? theme.accent.base : theme.colors.surface,
          borderWidth: 1,
          borderColor: selected ? theme.accent.base : theme.colors.border,
        }}
      >
        <Text variant="heading" tone={selected ? 'onAccent' : 'default'} numberOfLines={1}>
          {LANGUAGE_NAMES[language]}
        </Text>
        {selected ? <Icon name="check" size={18} color={theme.accent.onBase} strokeWidth={2.4} /> : null}
      </Pressable>
    </Animated.View>
  );
}
