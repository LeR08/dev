import * as Haptics from 'expo-haptics';
import React, { useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  type PressableProps,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive';
type Size = 'md' | 'lg';

export type ButtonProps = Omit<PressableProps, 'style'> & {
  label: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  /** Light haptic tap on press. On by default for primary actions. */
  haptic?: boolean;
  style?: ViewStyle;
  icon?: React.ReactNode;
};

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  haptic,
  disabled,
  onPress,
  style,
  icon,
  ...rest
}: ButtonProps) {
  const theme = useTheme();
  const scale = useRef(new Animated.Value(1)).current;
  const useHaptic = haptic ?? variant === 'primary';

  const press = (toValue: number) => {
    Animated.spring(scale, { toValue, useNativeDriver: true, speed: 40, bounciness: 4 }).start();
  };

  const background: Record<Variant, string> = {
    primary: theme.accent.base,
    secondary: theme.colors.surfaceMuted,
    ghost: 'transparent',
    destructive: theme.colors.surfaceMuted,
  };

  const textTone = variant === 'primary' ? 'onAccent' : variant === 'destructive' ? 'accent' : 'default';

  return (
    <Animated.View style={{ transform: [{ scale }], opacity: disabled || loading ? 0.55 : 1 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: Boolean(disabled), busy: loading }}
        disabled={disabled || loading}
        onPressIn={() => press(0.97)}
        onPressOut={() => press(1)}
        onPress={(event) => {
          if (useHaptic && Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          }
          onPress?.(event);
        }}
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: theme.spacing(2),
            backgroundColor: background[variant],
            borderRadius: theme.radius.pill,
            paddingVertical: size === 'lg' ? theme.spacing(4.5) : theme.spacing(3),
            paddingHorizontal: size === 'lg' ? theme.spacing(6) : theme.spacing(5),
            borderWidth: variant === 'ghost' ? 1 : 0,
            borderColor: theme.colors.border,
          },
          style,
        ]}
        {...rest}
      >
        {loading ? (
          <ActivityIndicator color={variant === 'primary' ? theme.accent.onBase : theme.colors.text} />
        ) : (
          <>
            {icon}
            <Text variant={size === 'lg' ? 'heading' : 'label'} tone={textTone}>
              {label}
            </Text>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}
