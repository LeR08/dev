import React, { useMemo, useState } from 'react';
import { View } from 'react-native';

import { currencySymbol } from '@/domain/format';
import { LEGAL_DRINKING_AGE, isValidAge, toggleReason, type ProfileDraft } from '@/domain/profile';
import { REASON_KEYS, type ReasonKey, type Settings } from '@/domain/types';
import { heightInUnit, inToCm, kgToLb, lbToKg } from '@/domain/units';
import { useTranslation } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { Card } from './ui/Card';
import { Chip } from './ui/Chip';
import { Field } from './ui/Field';
import { Text } from './ui/Text';

export type ProfileFieldsSection = 'about' | 'context' | 'all';

export type ProfileFieldsProps = {
  value: ProfileDraft;
  onChange: (next: ProfileDraft) => void;
  settings: Settings;
  section?: ProfileFieldsSection;
};

const REASON_I18N_KEY: Record<ReasonKey, string> = {
  sevrage: 'onboarding.profile.reasonSevrage',
  financial: 'onboarding.profile.reasonFinancial',
  curiosity: 'onboarding.profile.reasonCuriosity',
  medical: 'onboarding.profile.reasonMedical',
  other: 'onboarding.profile.reasonOther',
};

/**
 * The onboarding profile's fields (spec v1.2 §4.1), shared between onboarding
 * (split across two steps via `section`) and Settings → Profile (`section="all"`).
 *
 * Every field is genuinely optional except the reasons list — leaving sex,
 * age or weight blank simply disables the BAC estimate rather than guessing
 * at a value, per the spec's explicit "never guess or default silently" rule.
 */
export function ProfileFields({ value, onChange, settings, section = 'all' }: ProfileFieldsProps) {
  const theme = useTheme();
  const { t } = useTranslation();

  const showAbout = section === 'about' || section === 'all';
  const showContext = section === 'context' || section === 'all';

  const [ageText, setAgeText] = useState(value.age === null ? '' : `${value.age}`);
  const [weightText, setWeightText] = useState(() => weightText0(value.weightKg, settings.weightUnit));
  const [heightText, setHeightText] = useState(() =>
    value.heightCm === null ? '' : `${heightInUnit(value.heightCm, settings.heightUnit)}`
  );
  const [spendText, setSpendText] = useState(
    value.spendBeforeTrackingPerDay === null ? '' : `${roundForPeriod(value)}`
  );

  const ageNumber = parseNum(ageText);
  const ageInvalid = ageText.trim() !== '' && (ageNumber === null || !isValidAge(ageNumber));
  const showUnderAgeNotice = ageNumber !== null && isValidAge(ageNumber) && ageNumber < LEGAL_DRINKING_AGE;

  const commitAge = (text: string) => {
    setAgeText(text);
    const parsed = parseNum(text);
    onChange({ ...value, age: parsed !== null && isValidAge(parsed) ? Math.round(parsed) : value.age });
    if (text.trim() === '') onChange({ ...value, age: null });
  };

  const commitWeight = (text: string) => {
    setWeightText(text);
    const parsed = parseNum(text);
    if (text.trim() === '') {
      onChange({ ...value, weightKg: null });
      return;
    }
    if (parsed === null || parsed <= 0) return;
    const kg = settings.weightUnit === 'lb' ? lbToKg(parsed) : parsed;
    onChange({ ...value, weightKg: kg });
  };

  const commitHeight = (text: string) => {
    setHeightText(text);
    const parsed = parseNum(text);
    if (text.trim() === '') {
      onChange({ ...value, heightCm: null });
      return;
    }
    if (parsed === null || parsed <= 0) return;
    const cm = settings.heightUnit === 'in' ? inToCm(parsed) : parsed;
    onChange({ ...value, heightCm: cm });
  };

  const commitSpend = (text: string) => {
    setSpendText(text);
    const parsed = parseNum(text);
    if (text.trim() === '') {
      onChange({ ...value, spendBeforeTrackingPerDay: null });
      return;
    }
    if (parsed === null || parsed < 0) return;
    const perDay = value.spendPeriod === 'week' ? parsed / 7 : parsed;
    onChange({ ...value, spendBeforeTrackingPerDay: perDay });
  };

  const switchSpendPeriod = (period: 'day' | 'week') => {
    if (period === value.spendPeriod) return;
    onChange({ ...value, spendPeriod: period });
    // Re-express the currently typed figure in the new period so the number
    // on screen keeps meaning the same thing.
    const parsed = parseNum(spendText);
    if (parsed !== null) {
      const perDay = value.spendPeriod === 'week' ? parsed / 7 : parsed;
      setSpendText(`${roundForPeriod({ ...value, spendBeforeTrackingPerDay: perDay, spendPeriod: period })}`);
    }
  };

  const sexOptions: { value: ProfileDraft['sex']; labelKey: string }[] = useMemo(
    () => [
      { value: 'male', labelKey: 'onboarding.profile.sexMale' },
      { value: 'female', labelKey: 'onboarding.profile.sexFemale' },
      { value: 'unspecified', labelKey: 'common.preferNotToSay' },
    ],
    []
  );

  return (
    <View style={{ gap: theme.spacing(5) }}>
      {showAbout ? (
        <View style={{ gap: theme.spacing(4) }}>
          <View style={{ gap: theme.spacing(2) }}>
            <Text variant="caption" tone="muted" overline>
              {t('onboarding.profile.sexLabel')}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing(2) }}>
              {sexOptions.map((option) => (
                <Chip
                  key={option.value}
                  label={t(option.labelKey as never)}
                  selected={value.sex === option.value}
                  onPress={() => onChange({ ...value, sex: option.value })}
                />
              ))}
            </View>
            <Text variant="caption" tone="faint">
              {t('onboarding.profile.sexHint')}
            </Text>
          </View>

          <View>
            <Field
              label={t('onboarding.profile.ageLabel')}
              value={ageText}
              onChangeText={commitAge}
              keyboardType="number-pad"
              placeholder="—"
              hint={ageInvalid ? t('onboarding.profile.ageHint') : undefined}
            />
            {showUnderAgeNotice ? (
              <Card tone="muted" style={{ marginTop: theme.spacing(2) }}>
                <Text variant="caption" tone="muted">
                  {t('onboarding.profile.ageUnderNotice')}
                </Text>
              </Card>
            ) : null}
          </View>

          <View style={{ flexDirection: 'row', gap: theme.spacing(3) }}>
            <Field
              label={t('onboarding.profile.weightLabel')}
              value={weightText}
              onChangeText={commitWeight}
              keyboardType="decimal-pad"
              suffix={settings.weightUnit}
              placeholder="—"
              containerStyle={{ flex: 1 }}
            />
            <Field
              label={`${t('onboarding.profile.heightLabel')} (${t('common.optional')})`}
              value={heightText}
              onChangeText={commitHeight}
              keyboardType="decimal-pad"
              suffix={settings.heightUnit}
              placeholder="—"
              containerStyle={{ flex: 1 }}
            />
          </View>
        </View>
      ) : null}

      {showContext ? (
        <View style={{ gap: theme.spacing(4) }}>
          <View style={{ gap: theme.spacing(2) }}>
            <Text variant="caption" tone="muted" overline>
              {t('onboarding.profile.reasonsLabel')}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing(2) }}>
              {REASON_KEYS.map((reason) => (
                <Chip
                  key={reason}
                  label={t(REASON_I18N_KEY[reason] as never)}
                  selected={value.reasons.includes(reason)}
                  onPress={() => onChange({ ...value, reasons: toggleReason(value.reasons, reason) })}
                />
              ))}
            </View>
            <Text variant="caption" tone="faint">
              {t('onboarding.profile.reasonsHint')}
            </Text>
            {value.reasons.includes('other') ? (
              <Field
                value={value.otherReason ?? ''}
                onChangeText={(text) => onChange({ ...value, otherReason: text })}
                placeholder={t('onboarding.profile.reasonOtherPlaceholder')}
              />
            ) : null}
          </View>

          <View style={{ gap: theme.spacing(2) }}>
            <Field
              label={t('onboarding.profile.spendLabel')}
              value={spendText}
              onChangeText={commitSpend}
              keyboardType="decimal-pad"
              prefix={currencySymbol(settings.currency)}
              placeholder="—"
              hint={t('onboarding.profile.spendHint')}
            />
            <View style={{ flexDirection: 'row', gap: theme.spacing(2) }}>
              <Chip
                label={t('onboarding.profile.spendPerDay')}
                selected={value.spendPeriod === 'day'}
                onPress={() => switchSpendPeriod('day')}
              />
              <Chip
                label={t('onboarding.profile.spendPerWeek')}
                selected={value.spendPeriod === 'week'}
                onPress={() => switchSpendPeriod('week')}
              />
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function weightText0(kg: number | null, unit: Settings['weightUnit']): string {
  if (kg === null) return '';
  return `${Number((unit === 'lb' ? kgToLb(kg) : kg).toFixed(1))}`;
}

function roundForPeriod(value: ProfileDraft): number {
  if (value.spendBeforeTrackingPerDay === null) return 0;
  const amount = value.spendPeriod === 'week' ? value.spendBeforeTrackingPerDay * 7 : value.spendBeforeTrackingPerDay;
  return Number(amount.toFixed(2));
}

function parseNum(text: string): number | null {
  const normalized = text.replace(',', '.').trim();
  if (normalized === '') return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}
