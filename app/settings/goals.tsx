import React, { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { useTranslation } from '@/i18n/I18nProvider';
import { useApp } from '@/state/AppProvider';
import { useTheme } from '@/theme/ThemeProvider';

export default function GoalsScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { settings, updateSettings } = useApp();
  const toast = useToast();

  const [weekly, setWeekly] = useState(
    settings.goals.weeklyIntake === null ? '' : `${settings.goals.weeklyIntake}`
  );
  const [freeDays, setFreeDays] = useState(
    settings.goals.alcoholFreeDaysPerWeek === null ? '' : `${settings.goals.alcoholFreeDaysPerWeek}`
  );

  const unitLabel = t('goalsScreen.perWeekSuffix', {
    unit: settings.intakeUnit === 'grams' ? t('common.unitGramsShort') : t('common.drinkOther'),
  });

  const save = async () => {
    await updateSettings({
      goals: {
        weeklyIntake: parsePositive(weekly),
        alcoholFreeDaysPerWeek: clampDays(parsePositive(freeDays)),
      },
    });
    toast.show({ message: t('goalsScreen.savedToast') });
  };

  const clear = async () => {
    setWeekly('');
    setFreeDays('');
    await updateSettings({ goals: { weeklyIntake: null, alcoholFreeDaysPerWeek: null } });
    toast.show({ message: t('goalsScreen.clearedToast') });
  };

  return (
    <Screen>
      <View style={{ gap: theme.spacing(4), paddingTop: theme.spacing(4) }}>
        <Card tone="accent" style={{ gap: theme.spacing(1) }}>
          <Text variant="heading">{t('goalsScreen.optionalTitle')}</Text>
          <Text variant="body" tone="muted">
            {t('goalsScreen.optionalBody')}
          </Text>
        </Card>

        <Field
          label={t('goalsScreen.weeklyIntakeLabel')}
          value={weekly}
          onChangeText={setWeekly}
          keyboardType="decimal-pad"
          placeholder={t('goalsScreen.noGoalPlaceholder')}
          suffix={unitLabel}
          hint={t('goalsScreen.weeklyIntakeHint')}
        />

        <Field
          label={t('goalsScreen.freeDaysLabel')}
          value={freeDays}
          onChangeText={setFreeDays}
          keyboardType="number-pad"
          placeholder={t('goalsScreen.noGoalPlaceholder')}
          suffix={t('goalsScreen.freeDaysSuffix')}
          hint={t('goalsScreen.freeDaysHint')}
        />

        <Button label={t('goalsScreen.saveAction')} onPress={save} />
        <Button label={t('goalsScreen.clearAction')} variant="ghost" onPress={clear} haptic={false} />
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
