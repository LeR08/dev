import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';

type ToastAction = { label: string; onPress: () => void };

type ToastPayload = {
  message: string;
  action?: ToastAction;
  durationMs?: number;
};

type ToastContextValue = {
  show: (payload: ToastPayload) => void;
  hide: () => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION = 4200;

/**
 * Bottom toast with an optional action.
 *
 * Exists mainly so a one-tap log is safely reversible: log instantly, offer
 * Undo, never make the user confirm before something as small as a drink.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastPayload | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(16)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.timing(translate, { toValue: 16, duration: 160, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) setToast(null);
    });
  }, [opacity, translate]);

  const show = useCallback(
    (payload: ToastPayload) => {
      if (timer.current) clearTimeout(timer.current);
      setToast(payload);
      opacity.setValue(0);
      translate.setValue(16);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(translate, { toValue: 0, useNativeDriver: true, speed: 16, bounciness: 6 }),
      ]).start();
      timer.current = setTimeout(hide, payload.durationMs ?? DEFAULT_DURATION);
    },
    [hide, opacity, translate]
  );

  useEffect(() => () => (timer.current ? clearTimeout(timer.current) : undefined), []);

  return (
    <ToastContext.Provider value={{ show, hide }}>
      {children}
      {toast ? (
        <Animated.View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            left: theme.spacing(4),
            right: theme.spacing(4),
            bottom: insets.bottom + theme.spacing(4),
            opacity,
            transform: [{ translateY: translate }],
            alignItems: 'center',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing(3),
              maxWidth: 460,
              width: '100%',
              paddingVertical: theme.spacing(3),
              paddingHorizontal: theme.spacing(4),
              borderRadius: theme.radius.lg,
              backgroundColor: theme.mode === 'light' ? '#2A2622' : theme.colors.surfaceMuted,
              borderWidth: theme.mode === 'light' ? 0 : 1,
              borderColor: theme.colors.border,
            }}
          >
            <Text variant="label" style={{ flex: 1, color: '#F6F2EC' }} numberOfLines={2}>
              {toast.message}
            </Text>
            {toast.action ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  toast.action?.onPress();
                  hide();
                }}
                style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
              >
                <Text variant="label" style={{ color: theme.accent.base }}>
                  {toast.action.label}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside <ToastProvider>');
  return context;
}
