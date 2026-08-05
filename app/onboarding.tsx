import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { USE_NATIVE_DRIVER } from '@/components/ui/animation';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Screen } from '@/components/ui/Screen';
import { Segmented } from '@/components/ui/Segmented';
import { Text } from '@/components/ui/Text';
import { STANDARD_DRINK_PRESETS } from '@/domain/alcohol';
import { CURRENCIES } from '@/domain/format';
import type { IntakeUnit, VolumeUnit } from '@/domain/types';
import { useApp } from '@/state/AppProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { Chip } from '@/components/ui/Chip';

const STEP_COUNT = 3;

/**
 * First-run flow.
 *
 * Three short steps whose real job is to set the tone: this is private, it is
 * yours, and nothing here is going to judge you. Every choice has a sensible
 * default and can be changed later, so skipping straight through is fine.
 */
export default function OnboardingScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { settings, updateSettings } = useApp();

  const [step, setStep] = useState(0);
  const [weeklyGoal, setWeeklyGoal] = useState('');
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 320, useNativeDriver: USE_NATIVE_DRIVER }).start();
  }, [fade, step]);

  const finish = async () => {
    const parsed = Number(weeklyGoal.replace(',', '.').trim());
    const weeklyIntake = weeklyGoal.trim() !== '' && Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    await updateSettings({
      goals: { ...settings.goals, weeklyIntake },
      onboardingCompletedAt: Date.now(),
    });
    router.replace('/');
  };

  const next = () => {
    if (step < STEP_COUNT - 1) setStep((current) => current + 1);
    else void finish();
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background, paddingTop: insets.top }}>
      <Screen scrollProps={{ contentInsetAdjustmentBehavior: 'automatic' }}>
        <Animated.View style={{ opacity: fade, gap: theme.spacing(5), paddingTop: theme.spacing(10) }}>
          {step === 0 ? <Welcome /> : null}
          {step === 1 ? <UnitsStep /> : null}
          {step === 2 ? <GoalStep value={weeklyGoal} onChange={setWeeklyGoal} /> : null}
        </Animated.View>
      </Screen>

      <View
        style={{
          paddingHorizontal: theme.spacing(5),
          paddingBottom: insets.bottom + theme.spacing(5),
          gap: theme.spacing(3),
          maxWidth: 560,
          width: '100%',
          alignSelf: 'center',
        }}
      >
        <View style={{ flexDirection: 'row', gap: theme.spacing(1.5), justifyContent: 'center' }}>
          {Array.from({ length: STEP_COUNT }, (_, index) => (
            <View
              key={index}
              style={{
                width: index === step ? 20 : 7,
                height: 7,
                borderRadius: 4,
                backgroundColor: index === step ? theme.accent.base : theme.colors.trackEmpty,
              }}
            />
          ))}
        </View>

        <Button label={step === STEP_COUNT - 1 ? 'Start tracking' : 'Continue'} size="lg" onPress={next} />

        {step < STEP_COUNT - 1 ? (
          <Button label="Skip setup" variant="ghost" haptic={false} onPress={() => void finish()} />
        ) : null}
      </View>
    </View>
  );
}

function Welcome() {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing(4) }}>
      <Text variant="display">Tally</Text>
      <Text variant="heading" tone="muted">
        A quiet place to keep track of what you drink.
      </Text>
      <Card tone="accent" style={{ gap: theme.spacing(2) }}>
        <Text variant="body">
          No account. No cloud. Everything you log stays in a database on this phone, and nothing
          leaves it unless you export it yourself.
        </Text>
        <Text variant="body" tone="muted">
          There are no warnings here, no red numbers and no lectures. Just what you logged, shown
          clearly, plus a count of your alcohol-free days.
        </Text>
      </Card>
    </View>
  );
}

function UnitsStep() {
  const theme = useTheme();
  const { settings, updateSettings } = useApp();

  return (
    <View style={{ gap: theme.spacing(4) }}>
      <Text variant="title">How should we count?</Text>
      <Text variant="body" tone="muted">
        All of this is changeable later in Settings.
      </Text>

      <View style={{ gap: theme.spacing(2) }}>
        <Text variant="caption" tone="muted" overline>
          Volumes
        </Text>
        <Segmented<VolumeUnit>
          options={[
            { value: 'cl', label: 'Centilitres' },
            { value: 'ml', label: 'Millilitres' },
          ]}
          value={settings.volumeUnit}
          onChange={(volumeUnit) => updateSettings({ volumeUnit })}
        />
      </View>

      <View style={{ gap: theme.spacing(2) }}>
        <Text variant="caption" tone="muted" overline>
          Intake shown as
        </Text>
        <Segmented<IntakeUnit>
          options={[
            { value: 'standardDrinks', label: 'Standard drinks' },
            { value: 'grams', label: 'Grams of alcohol' },
          ]}
          value={settings.intakeUnit}
          onChange={(intakeUnit) => updateSettings({ intakeUnit })}
        />
      </View>

      <View style={{ gap: theme.spacing(2) }}>
        <Text variant="caption" tone="muted" overline>
          One standard drink is
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing(2) }}>
          {STANDARD_DRINK_PRESETS.map((preset) => (
            <Chip
              key={preset.grams}
              label={`${preset.grams} g · ${preset.label}`}
              selected={settings.standardDrinkGrams === preset.grams}
              onPress={() => updateSettings({ standardDrinkGrams: preset.grams })}
            />
          ))}
        </View>
      </View>

      <View style={{ gap: theme.spacing(2) }}>
        <Text variant="caption" tone="muted" overline>
          Currency
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing(2) }}>
          {CURRENCIES.slice(0, 6).map((currency) => (
            <Chip
              key={currency.code}
              label={`${currency.symbol} ${currency.code}`}
              selected={settings.currency === currency.code}
              onPress={() => updateSettings({ currency: currency.code })}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

function GoalStep({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const theme = useTheme();
  const { settings } = useApp();
  const unit = settings.intakeUnit === 'grams' ? 'g per week' : 'drinks per week';

  return (
    <View style={{ gap: theme.spacing(4) }}>
      <Text variant="title">Want a personal marker?</Text>
      <Text variant="body" tone="muted">
        Some people find a weekly number useful to aim at. Plenty of people would rather just watch
        the numbers for a while first — that is a perfectly good answer, and you can leave this
        empty.
      </Text>

      <Field
        label="Weekly intake goal (optional)"
        value={value}
        onChangeText={onChange}
        keyboardType="decimal-pad"
        placeholder="Leave empty for none"
        suffix={unit}
      />

      <Card style={{ gap: theme.spacing(1) }}>
        <Text variant="caption" tone="muted" overline>
          What a goal does
        </Text>
        <Text variant="body" tone="muted">
          It draws a dashed line on your chart. That is all. Going past it changes nothing about how
          the app talks to you.
        </Text>
      </Card>
    </View>
  );
}
