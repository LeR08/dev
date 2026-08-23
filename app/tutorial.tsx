import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { USE_NATIVE_DRIVER } from '@/components/ui/animation';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { useTranslation } from '@/i18n/I18nProvider';
import { useApp } from '@/state/AppProvider';
import { useTheme } from '@/theme/ThemeProvider';

const SLIDES = ['log', 'history', 'insights', 'help'] as const;
type SlideKey = (typeof SLIDES)[number];

/** How many taps the interactive first slide accepts before it's "done". */
const DEMO_TAP_TARGET = 3;

/**
 * First-run tutorial, shown once between onboarding and the app itself
 * (see app/_layout.tsx's Boot redirect chain), and replayable from
 * Settings → Tutorial.
 *
 * Deliberately built to be *done* rather than *read*: four swipeable slides,
 * each carrying one short line and a moving mock-up of the real screen it
 * describes, and the first slide only advances once the user has actually
 * tapped a working + button a few times. Skip stays available throughout —
 * a tutorial nobody can escape is worse than no tutorial.
 */
export default function TutorialScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { updateSettings } = useApp();
  const { width } = useWindowDimensions();

  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);

  const finish = async () => {
    await updateSettings({ tutorialCompletedAt: Date.now() });
    router.replace('/');
  };

  const goTo = (next: number) => {
    const clamped = Math.max(0, Math.min(next, SLIDES.length - 1));
    scrollRef.current?.scrollTo({ x: clamped * width, animated: true });
    setIndex(clamped);
  };

  const onMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(event.nativeEvent.contentOffset.x / width);
    if (next !== index) setIndex(next);
  };

  const isLast = index === SLIDES.length - 1;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background, paddingTop: insets.top }}>
      <View style={{ alignItems: 'flex-end', paddingHorizontal: theme.spacing(3), height: 44, justifyContent: 'center' }}>
        {!isLast ? (
          <Pressable
            accessibilityRole="button"
            hitSlop={12}
            onPress={() => void finish()}
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, padding: theme.spacing(2) })}
          >
            <Text variant="label" tone="muted">
              {t('tutorial.skip')}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
        style={{ flex: 1 }}
      >
        {SLIDES.map((slide) => (
          <Slide key={slide} slide={slide} width={width} />
        ))}
      </ScrollView>

      <View
        style={{
          paddingHorizontal: theme.spacing(5),
          paddingBottom: insets.bottom + theme.spacing(5),
          gap: theme.spacing(4),
          maxWidth: 560,
          width: '100%',
          alignSelf: 'center',
        }}
      >
        <View style={{ flexDirection: 'row', gap: theme.spacing(2), justifyContent: 'center' }}>
          {SLIDES.map((slide, dotIndex) => (
            <Pressable
              key={slide}
              accessibilityRole="button"
              hitSlop={10}
              onPress={() => goTo(dotIndex)}
              style={{ paddingVertical: theme.spacing(1) }}
            >
              <View
                style={{
                  width: dotIndex === index ? 22 : 7,
                  height: 7,
                  borderRadius: 4,
                  backgroundColor: dotIndex === index ? theme.accent.base : theme.colors.trackEmpty,
                }}
              />
            </Pressable>
          ))}
        </View>

        <Button
          label={isLast ? t('tutorial.startAction') : t('common.continue')}
          size="lg"
          onPress={() => (isLast ? void finish() : goTo(index + 1))}
        />
      </View>
    </View>
  );
}

function Slide({ slide, width }: { slide: SlideKey; width: number }) {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <View style={{ width, paddingHorizontal: theme.spacing(5), justifyContent: 'center' }}>
      <View style={{ maxWidth: 560, width: '100%', alignSelf: 'center', gap: theme.spacing(6) }}>
        <View style={{ minHeight: 220, justifyContent: 'center' }}>
          {slide === 'log' ? <LogDemo /> : null}
          {slide === 'history' ? <HistoryDemo /> : null}
          {slide === 'insights' ? <InsightsDemo /> : null}
          {slide === 'help' ? <HelpDemo /> : null}
        </View>

        <View style={{ gap: theme.spacing(2) }}>
          <Text variant="title">{t(`tutorial.${slide}.title` as never)}</Text>
          <Text variant="body" tone="muted">
            {t(`tutorial.${slide}.body` as never)}
          </Text>
        </View>
      </View>
    </View>
  );
}

/**
 * The one slide that asks for a real action. The + button works: each tap
 * bumps a counter with the same spring the real Today screen uses, so the
 * gesture the app is built around is learned by doing it, not by reading
 * about it.
 */
function LogDemo() {
  const theme = useTheme();
  const { t } = useTranslation();
  const [taps, setTaps] = useState(0);

  const pulse = useRef(new Animated.Value(1)).current;
  const bump = useRef(new Animated.Value(1)).current;

  // Breathe until the first tap lands, then stop — once the user has got the
  // idea, a pulsing button is just noise.
  useEffect(() => {
    if (taps > 0) {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.1, duration: 780, useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(pulse, { toValue: 1, duration: 780, useNativeDriver: USE_NATIVE_DRIVER }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, taps]);

  const onTap = () => {
    setTaps((current) => Math.min(current + 1, DEMO_TAP_TARGET));
    bump.setValue(1.5);
    Animated.spring(bump, { toValue: 1, friction: 4, useNativeDriver: USE_NATIVE_DRIVER }).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  const done = taps >= DEMO_TAP_TARGET;

  return (
    <View style={{ alignItems: 'center', gap: theme.spacing(5) }}>
      <View style={{ alignItems: 'center', gap: theme.spacing(1) }}>
        <Animated.Text
          style={{
            ...theme.type.hero,
            color: taps > 0 ? theme.accent.strong : theme.colors.textFaint,
            transform: [{ scale: bump }],
          }}
        >
          {taps}
        </Animated.Text>
        <Text variant="caption" tone="muted" overline>
          {t('tutorial.log.counterLabel')}
        </Text>
      </View>

      <Animated.View style={{ transform: [{ scale: pulse }] }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('tutorial.log.tapHint')}
          onPress={onTap}
          style={({ pressed }) => ({
            width: 76,
            height: 76,
            borderRadius: 38,
            backgroundColor: theme.accent.base,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Icon name="plus" size={34} color={theme.accent.onBase} strokeWidth={2.4} />
        </Pressable>
      </Animated.View>

      <Text variant="label" tone={done ? 'accent' : 'faint'} center>
        {done ? t('tutorial.log.tapDone') : t('tutorial.log.tapHint')}
      </Text>
    </View>
  );
}

/** Three mock history rows, each fading in just behind the one before it. */
function HistoryDemo() {
  const theme = useTheme();
  const rows = [
    { color: theme.categoryColor('beer'), width: '72%' as const },
    { color: theme.categoryColor('wine'), width: '58%' as const },
    { color: theme.categoryColor('spirit'), width: '65%' as const },
  ];

  return (
    <View style={{ gap: theme.spacing(3) }}>
      {rows.map((row, rowIndex) => (
        <StaggeredIn key={row.color} delay={rowIndex * 140}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing(3),
              backgroundColor: theme.colors.surface,
              borderRadius: theme.radius.lg,
              borderWidth: 1,
              borderColor: theme.colors.border,
              padding: theme.spacing(4),
            }}
          >
            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: row.color }} />
            <View style={{ flex: 1, gap: 6 }}>
              <View style={{ height: 9, width: row.width, borderRadius: 5, backgroundColor: theme.colors.trackEmpty }} />
              <View style={{ height: 7, width: '35%', borderRadius: 4, backgroundColor: theme.colors.surfaceMuted }} />
            </View>
          </View>
        </StaggeredIn>
      ))}
    </View>
  );
}

/** A mini bar chart that grows on mount, over a money figure. */
function InsightsDemo() {
  const theme = useTheme();
  const { t } = useTranslation();
  const heights = [0.45, 0.7, 0.35, 0.9, 0.55, 0.25, 0.6];

  return (
    <View style={{ gap: theme.spacing(5) }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: theme.spacing(2), height: 120 }}>
        {heights.map((height, barIndex) => (
          <GrowingBar key={barIndex} fraction={height} delay={barIndex * 70} />
        ))}
      </View>
      <View style={{ alignItems: 'center', gap: theme.spacing(1) }}>
        <Text variant="hero" style={{ color: theme.money.strong }}>
          128 €
        </Text>
        <Text variant="caption" tone="muted" overline>
          {t('tutorial.insights.savedLabel')}
        </Text>
      </View>
    </View>
  );
}

/** The lifebuoy, plus two placeholder resource rows. */
function HelpDemo() {
  const theme = useTheme();

  return (
    <View style={{ alignItems: 'center', gap: theme.spacing(5) }}>
      <StaggeredIn delay={0}>
        <View
          style={{
            width: 92,
            height: 92,
            borderRadius: 46,
            backgroundColor: theme.accent.soft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="lifebuoy" size={44} color={theme.accent.strong} strokeWidth={1.8} />
        </View>
      </StaggeredIn>
      <View style={{ gap: theme.spacing(2), width: '100%' }}>
        {(['82%', '64%'] as const).map((barWidth, rowIndex) => (
          <StaggeredIn key={barWidth} delay={160 + rowIndex * 140}>
            <View
              style={{
                backgroundColor: theme.colors.surfaceMuted,
                borderRadius: theme.radius.md,
                padding: theme.spacing(3.5),
                gap: 7,
              }}
            >
              <View style={{ height: 9, width: barWidth, borderRadius: 5, backgroundColor: theme.colors.trackEmpty }} />
              <View style={{ height: 7, width: '40%', borderRadius: 4, backgroundColor: theme.colors.border }} />
            </View>
          </StaggeredIn>
        ))}
      </View>
    </View>
  );
}

function StaggeredIn({ delay, children }: { delay: number; children: React.ReactNode }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 380,
      delay,
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();
  }, [delay, progress]);

  return (
    <Animated.View
      style={{
        opacity: progress,
        transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
      }}
    >
      {children}
    </Animated.View>
  );
}

function GrowingBar({ fraction, delay }: { fraction: number; delay: number }) {
  const theme = useTheme();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 520,
      delay,
      // Animating height can't use the native driver — it's a layout property.
      useNativeDriver: false,
    }).start();
  }, [delay, progress]);

  return (
    <Animated.View
      style={{
        flex: 1,
        borderRadius: theme.radius.sm,
        backgroundColor: theme.accent.base,
        height: progress.interpolate({ inputRange: [0, 1], outputRange: ['6%', `${fraction * 100}%`] }),
      }}
    />
  );
}
