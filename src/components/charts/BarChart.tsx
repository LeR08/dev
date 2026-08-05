import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Pressable, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '../ui/Text';

export type BarDatum = {
  key: string;
  label: string;
  value: number;
  /** Highlighted bars use the accent colour — used for "current period". */
  highlight?: boolean;
};

export type BarChartProps = {
  data: BarDatum[];
  height?: number;
  color?: string;
  /** Optional dashed reference line, e.g. a weekly goal. */
  goal?: number | null;
  goalLabel?: string;
  formatValue?: (value: number) => string;
  selectedKey?: string | null;
  onSelect?: (datum: BarDatum | null) => void;
};

const MIN_VISIBLE_FRACTION = 0.02;

type LabelCell = { key: string; label: string; span: number; emphasis: boolean };

/**
 * Collapses the label row so sparse labels get room to breathe.
 *
 * A caller labelling only every fifth bar (a 30-day axis, say) passes empty
 * strings for the rest; each label then spans its run of blanks instead of
 * being squeezed into one bar's width and truncated to "1…".
 */
function labelCells(data: BarDatum[]): LabelCell[] {
  const cells: LabelCell[] = [];
  let index = 0;

  while (index < data.length) {
    let span = 1;
    while (index + span < data.length && data[index + span].label === '') span += 1;
    const group = data.slice(index, index + span);
    cells.push({
      key: data[index].key,
      label: data[index].label,
      span,
      emphasis: group.some((datum) => datum.highlight),
    });
    index += span;
  }

  return cells;
}

/**
 * Animated bar chart.
 *
 * Built from views rather than SVG paths: bars are the only shape needed, and
 * native-driven height animations stay smooth on a mid-range phone.
 */
export function BarChart({
  data,
  height = 160,
  color,
  goal,
  goalLabel,
  formatValue,
  selectedKey,
  onSelect,
}: BarChartProps) {
  const theme = useTheme();
  const barColor = color ?? theme.accent.base;

  const max = useMemo(() => {
    const highest = Math.max(0, ...data.map((datum) => datum.value), goal ?? 0);
    return highest > 0 ? highest : 1;
  }, [data, goal]);

  // One Animated.Value per bar slot, reused across data updates so the chart
  // grows into its new shape instead of snapping.
  const animations = useRef<Animated.Value[]>([]);
  if (animations.current.length !== data.length) {
    animations.current = data.map(
      (_, index) => animations.current[index] ?? new Animated.Value(0)
    );
  }

  useEffect(() => {
    const timings = data.map((datum, index) =>
      Animated.timing(animations.current[index], {
        toValue: Math.max(datum.value > 0 ? MIN_VISIBLE_FRACTION : 0, datum.value / max),
        duration: 420,
        delay: Math.min(index * 22, 200),
        useNativeDriver: false,
      })
    );
    Animated.parallel(timings).start();
  }, [data, max]);

  const goalFraction = goal && goal > 0 ? Math.min(1, goal / max) : null;
  const gap = data.length > 14 ? 2 : theme.spacing(1.5);

  return (
    <View style={{ gap: theme.spacing(2) }}>
      <View style={{ height, flexDirection: 'row', alignItems: 'flex-end', gap }}>
        {goalFraction !== null ? (
          <View
            style={{
              pointerEvents: 'none',
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: goalFraction * height,
              borderBottomWidth: 1,
              borderStyle: 'dashed',
              borderColor: theme.colors.textFaint,
            }}
          >
            {goalLabel ? (
              <Text variant="caption" tone="faint" style={{ position: 'absolute', right: 0, bottom: 3 }}>
                {goalLabel}
              </Text>
            ) : null}
          </View>
        ) : null}

        {data.map((datum, index) => {
          const selected = selectedKey === datum.key;
          const fill = datum.highlight || selected ? barColor : `${barColor}66`;
          return (
            <Pressable
              key={datum.key}
              accessibilityRole="button"
              accessibilityLabel={`${datum.label}: ${formatValue ? formatValue(datum.value) : datum.value}`}
              disabled={!onSelect}
              onPress={() => onSelect?.(selected ? null : datum)}
              style={{ flex: 1, height, justifyContent: 'flex-end' }}
            >
              <Animated.View
                style={{
                  height: animations.current[index].interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, height],
                  }),
                  minHeight: datum.value > 0 ? 3 : 0,
                  backgroundColor: datum.value > 0 ? fill : theme.colors.trackEmpty,
                  borderRadius: theme.radius.sm,
                  borderWidth: selected ? 2 : 0,
                  borderColor: theme.colors.text,
                }}
              />
              {datum.value === 0 ? (
                <View
                  style={{
                    height: 3,
                    borderRadius: 2,
                    backgroundColor: theme.colors.trackEmpty,
                  }}
                />
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <View style={{ flexDirection: 'row', gap }}>
        {labelCells(data).map((cell) => (
          <View
            key={cell.key}
            style={{ flex: cell.span, alignItems: cell.span === 1 ? 'center' : 'flex-start' }}
          >
            <Text variant="caption" tone={cell.emphasis ? 'default' : 'faint'} numberOfLines={1}>
              {cell.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
