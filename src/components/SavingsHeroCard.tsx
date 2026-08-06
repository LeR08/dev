import { LinearGradient } from 'expo-linear-gradient';
import React, { useRef } from 'react';
import { Animated, Platform, Pressable, View, type ViewStyle } from 'react-native';

import { Text } from '@/components/ui/Text';
import { formatMoney } from '@/domain/format';
import { savingsHeadline } from '@/domain/savings';
import { useTranslation } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { USE_NATIVE_DRIVER } from './ui/animation';

export type SavingsHeroCardProps = {
  /** Null when there's no spending baseline to compare against yet. */
  saved: number | null;
  currency: string;
  onPress: () => void;
};

/**
 * The front-page money hero: money is a plainly common motivator alongside
 * wellbeing, so what's being saved gets the biggest, boldest treatment on
 * the app's very first screen rather than being tucked away in a deep-dive
 * — paired with a line on why a small, consistent effort compounds, since
 * that's the actual case for keeping at it.
 */
export function SavingsHeroCard({ saved, currency, onPress }: SavingsHeroCardProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const scale = useRef(new Animated.Value(1)).current;

  const press = (toValue: number) => {
    Animated.spring(scale, { toValue, useNativeDriver: USE_NATIVE_DRIVER, speed: 40, bounciness: 4 }).start();
  };

  const hasBaseline = saved !== null;
  const headline = hasBaseline ? savingsHeadline(saved) : null;
  const headlineLabel =
    headline === 'saved'
      ? t('savings.savedLabel')
      : headline === 'spentMore'
        ? t('savings.spentMoreLabel')
        : t('savings.evenLabel');

  const shadow: ViewStyle =
    Platform.OS === 'web'
      ? ({ boxShadow: `0 6px 20px ${theme.colors.shadow}` } as unknown as ViewStyle)
      : {
          shadowColor: theme.colors.shadow,
          shadowOpacity: theme.mode === 'light' ? 1 : 0.6,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 6 },
          elevation: 3,
        };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        accessibilityRole="button"
        onPressIn={() => press(0.98)}
        onPressOut={() => press(1)}
        onPress={onPress}
      >
        <LinearGradient
          colors={[theme.money.base, theme.money.strong]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[{ borderRadius: theme.radius.xl, padding: theme.spacing(5), gap: theme.spacing(1) }, shadow]}
        >
          <Text
            variant="caption"
            overline
            style={{ color: theme.money.onBase, opacity: 0.8 }}
          >
            {t('today.savingsHero.badge')}
          </Text>

          {hasBaseline ? (
            <>
              <Text variant="hero" style={{ color: theme.money.onBase }} numberOfLines={1} adjustsFontSizeToFit>
                {formatMoney(Math.abs(saved), currency)}
              </Text>
              <Text variant="body" style={{ color: theme.money.onBase, opacity: 0.85 }}>
                {headlineLabel} · {t('savings.sinceTracking')}
              </Text>
            </>
          ) : (
            <>
              <Text variant="title" style={{ color: theme.money.onBase }}>
                {t('savings.noBaselineTitle')}
              </Text>
              <Text variant="body" style={{ color: theme.money.onBase, opacity: 0.85 }}>
                {t('savings.noBaselinePrompt')}
              </Text>
            </>
          )}

          <View
            style={{
              height: 1,
              backgroundColor: theme.money.onBase,
              opacity: 0.2,
              marginVertical: theme.spacing(2),
            }}
          />

          <Text variant="caption" style={{ color: theme.money.onBase, opacity: 0.9 }}>
            {t('today.savingsHero.pareto')}
          </Text>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}
