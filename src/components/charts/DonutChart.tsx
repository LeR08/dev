import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '../ui/Text';

export type DonutSlice = {
  key: string;
  label: string;
  value: number;
  color: string;
};

export type DonutChartProps = {
  slices: DonutSlice[];
  size?: number;
  thickness?: number;
  centerValue?: string;
  centerLabel?: string;
};

/**
 * Ring chart for the category breakdown.
 *
 * Each slice is a stroked arc on the same circle, positioned with a dash offset
 * — cheaper than generating paths and it renders identically on web.
 */
export function DonutChart({
  slices,
  size = 168,
  thickness = 22,
  centerValue,
  centerLabel,
}: DonutChartProps) {
  const theme = useTheme();
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);

  const appear = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    appear.setValue(0);
    Animated.timing(appear, { toValue: 1, duration: 450, useNativeDriver: true }).start();
  }, [appear, slices]);

  let offset = 0;

  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: appear,
        transform: [{ scale: appear.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }],
      }}
    >
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <G rotation={-90} originX={size / 2} originY={size / 2}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={theme.colors.trackEmpty}
            strokeWidth={thickness}
            fill="none"
          />
          {total > 0
            ? slices.map((slice) => {
                const fraction = slice.value / total;
                // Leave a hairline gap between slices so neighbours stay readable.
                const length = Math.max(0, fraction * circumference - 2);
                const dash = `${length} ${circumference - length}`;
                const element = (
                  <Circle
                    key={slice.key}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={slice.color}
                    strokeWidth={thickness}
                    strokeDasharray={dash}
                    strokeDashoffset={-offset}
                    strokeLinecap="butt"
                    fill="none"
                  />
                );
                offset += fraction * circumference;
                return element;
              })
            : null}
        </G>
      </Svg>

      <View style={{ alignItems: 'center', gap: 2 }}>
        {centerValue ? <Text variant="heading">{centerValue}</Text> : null}
        {centerLabel ? (
          <Text variant="caption" tone="muted">
            {centerLabel}
          </Text>
        ) : null}
      </View>
    </Animated.View>
  );
}
