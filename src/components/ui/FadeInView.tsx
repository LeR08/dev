import React, { useEffect, useRef } from 'react';
import { Animated, Easing, type ViewStyle } from 'react-native';

import { USE_NATIVE_DRIVER } from './animation';

export type FadeInViewProps = {
  children: React.ReactNode;
  /** Stagger entrance across a list of cards — pass `index * 60` or similar. */
  delay?: number;
  duration?: number;
  /** How far up (px) the content slides in from. 0 disables the slide. */
  distance?: number;
  style?: ViewStyle;
};

/**
 * Fade + slide-up entrance, used for cards that appear together on a screen
 * (Today, Insights, Help) so the page feels considered rather than static.
 * Runs once on mount — re-mounting (e.g. a key change) replays it, which is
 * how the staggered "cards settle into place" effect is achieved on lists.
 */
export function FadeInView({ children, delay = 0, duration = 420, distance = 12, style }: FadeInViewProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(distance)).current;

  useEffect(() => {
    const animation = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
    ]);
    animation.start();
    return () => animation.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]}>
      {children}
    </Animated.View>
  );
}
