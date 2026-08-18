import React, { useRef } from 'react';
import { Animated, Pressable, View } from 'react-native';

import { FadeInView } from '@/components/ui/FadeInView';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { USE_NATIVE_DRIVER } from '@/components/ui/animation';
import { LANGUAGES, type LanguageCode } from '@/domain/types';
import { LANGUAGE_NAMES } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';

export type LanguagePickerGridProps = {
  selected: LanguageCode;
  onSelect: (language: LanguageCode) => void;
  /** Off inside a modal, where the whole sheet already animates in. */
  animated?: boolean;
};

/**
 * The grid of language cards — shared between the full Settings → Language
 * screen and LanguagePickerModal (used where navigating to a separate route
 * isn't an option, e.g. the mandatory auth gate, reached before there's
 * anywhere else to navigate to).
 */
export function LanguagePickerGrid({ selected, onSelect, animated = true }: LanguagePickerGridProps) {
  const theme = useTheme();

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing(3) }}>
      {LANGUAGES.map((language, index) => {
        const card = (
          <LanguageCard language={language} selected={selected === language} onPress={() => onSelect(language)} />
        );
        return animated ? (
          <FadeInView key={language} delay={index * 40} distance={8} style={{ width: '47%' }}>
            {card}
          </FadeInView>
        ) : (
          <View key={language} style={{ width: '47%' }}>
            {card}
          </View>
        );
      })}
    </View>
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
