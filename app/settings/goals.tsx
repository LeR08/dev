import React, { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { intakeUnitLabel } from '@/domain/format';
import { useApp } from '@/state/AppProvider';
import { useTheme } from '@/theme/ThemeProvider';

export default function GoalsScreen() {
  const theme = useTheme();
  const { settings, updateSettings } = useApp();
  const toast = useToast();

  const [weekly, setWeekly] = useState(
    settings.goals.weeklyIntake === null ? '' : `${settings.goals.weeklyIntake}`
  );
  const [freeDays, setFreeDays] = useState(
    settings.goals.alcoholFreeDaysPerWeek === null ? '' : `${settings.goals.alcoholFreeDaysPerWeek}`
  );

  const unitLabel = settings.intakeUnit === 'grams' ? 'g per week' : `${intakeUnitLabel(settings.intakeUnit)} per week`;

  const save = async () => {
    await updateSettings({
      goals: {
        weeklyIntake: parsePositive(weekly),
        alcoholFreeDaysPerWeek: clampDays(parsePositive(freeDays)),
      },
    });
    toast.show({ message: 'Goals saved' });
  };

  const clear = async () => {
    setWeekly('');
    setFreeDays('');
    await updateSettings({ goals: { weeklyIntake: null, alcoholFreeDaysPerWeek: null } });
    toast.show({ message: 'Goals cleared' });
  };

  return (
    <Screen>
      <View style={{ gap: theme.spacing(4), paddingTop: theme.spacing(4) }}>
        <Card tone="accent" style={{ gap: theme.spacing(1) }}>
          <Text variant="heading">Entirely optional</Text>
          <Text variant="body" tone="muted">
            Goals are yours to set, change, or ignore. Nothing here locks, warns, or nags — a goal
            just draws a quiet line on your charts so you can see where you are relative to it.
          </Text>
        </Card>

        <Field
          label="Weekly intake"
          value={weekly}
          onChangeText={setWeekly}
          keyboardType="decimal-pad"
          placeholder="No goal"
          suffix={unitLabel}
          hint="Leave empty for no weekly target."
        />

        <Field
          label="Alcohol-free days per week"
          value={freeDays}
          onChangeText={setFreeDays}
          keyboardType="number-pad"
          placeholder="No goal"
          suffix="days"
          hint="Between 0 and 7. Leave empty to skip."
        />

        <Button label="Save goals" onPress={save} />
        <Button label="Clear both goals" variant="ghost" onPress={clear} haptic={false} />
      </View>
    </Screen>
  );
}

function parsePositive(text: string): number | null {
  const normalized = text.replace(',', '.').trim();
  if (normalized === '') return null;
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) return null;
  return value;
}

function clampDays(value: number | null): number | null {
  if (value === null) return null;
  return Math.min(7, Math.max(0, Math.round(value)));
}
