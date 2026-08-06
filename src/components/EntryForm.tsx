import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { clToMl, gramsToIntake, pureAlcoholGrams } from '@/domain/alcohol';
import {
  currencySymbol,
  formatVolume,
  trimNumber,
  volumeInUnit,
} from '@/domain/format';
import { commonVolumesMl } from '@/domain/servings';
import { type Category, type EntryInput, type Settings } from '@/domain/types';
import { categoryLabel } from '@/i18n/categoryLabel';
import { formatIntakeLabel } from '@/i18n/formatIntakeLabel';
import { useTranslation } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Chip } from './ui/Chip';
import { DateTimeField } from './ui/DateTimeField';
import { Field } from './ui/Field';
import { Stepper } from './ui/Stepper';
import { Text } from './ui/Text';

export type EntryFormValues = {
  drinkId: string | null;
  name: string;
  category: Category;
  abv: number;
  volumeMl: number;
  quantity: number;
  price: number | null;
  consumedAt: number;
  note: string | null;
  location: string | null;
};

export type EntryFormProps = {
  initial: EntryFormValues;
  settings: Settings;
  submitLabel: string;
  onSubmit: (input: EntryInput) => void | Promise<void>;
  onDelete?: () => void;
  /** Shown under the delete button, e.g. to explain that it cannot be undone. */
  deleteHint?: string;
};

/**
 * Shared form for logging a new drink and editing an existing entry.
 *
 * Every field except the drink itself is optional and pre-filled, so confirming
 * straight away is always a valid path — adjusting is opt-in.
 */
export function EntryForm({
  initial,
  settings,
  submitLabel,
  onSubmit,
  onDelete,
  deleteHint,
}: EntryFormProps) {
  const theme = useTheme();
  const { t } = useTranslation();

  const [quantity, setQuantity] = useState(initial.quantity);
  const [volumeText, setVolumeText] = useState(() =>
    `${volumeInUnit(initial.volumeMl, settings.volumeUnit)}`
  );
  const [abvText, setAbvText] = useState(() => trimNumber(initial.abv, 2));
  const [priceText, setPriceText] = useState(() => (initial.price === null ? '' : `${initial.price}`));
  const [consumedAt, setConsumedAt] = useState(initial.consumedAt);
  const [note, setNote] = useState(initial.note ?? '');
  const [location, setLocation] = useState(initial.location ?? '');
  const [saving, setSaving] = useState(false);

  const volumeMl = useMemo(() => {
    const parsed = parseNumber(volumeText);
    if (parsed === null) return 0;
    return settings.volumeUnit === 'cl' ? clToMl(parsed) : parsed;
  }, [settings.volumeUnit, volumeText]);

  const abv = parseNumber(abvText) ?? 0;
  const price = parseNumber(priceText);

  const grams = pureAlcoholGrams(volumeMl, abv, quantity);
  const intake = gramsToIntake(grams, settings.intakeUnit, settings.standardDrinkGrams);

  const volumeInvalid = volumeMl <= 0;
  const abvInvalid = abv < 0 || abv > 100;
  const canSubmit = !volumeInvalid && !abvInvalid && !saving;

  const submit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      await onSubmit({
        drinkId: initial.drinkId,
        name: initial.name,
        category: initial.category,
        abv,
        volumeMl,
        quantity,
        price,
        consumedAt,
        note: note.trim() ? note.trim() : null,
        location: location.trim() ? location.trim() : null,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{
        padding: theme.spacing(5),
        paddingBottom: theme.spacing(14),
        gap: theme.spacing(4),
        maxWidth: 560,
        width: '100%',
        alignSelf: 'center',
      }}
      keyboardShouldPersistTaps="handled"
    >
      <Card style={{ gap: theme.spacing(1) }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing(2) }}>
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: theme.categoryColor(initial.category),
            }}
          />
          <Text variant="caption" tone="muted" overline>
            {categoryLabel(t, initial.category)}
          </Text>
        </View>
        <Text variant="title">{initial.name}</Text>
        <Text variant="body" tone="muted">
          {formatVolume(volumeMl, settings.volumeUnit)} · {trimNumber(abv, 1)}% ·{' '}
          {formatIntakeLabel(t, intake, settings.intakeUnit)}
        </Text>
      </Card>

      <Stepper
        label={t('entryForm.howManyLabel')}
        value={quantity}
        onChange={setQuantity}
        step={1}
        min={1}
        max={30}
        format={(value) => `${value}`}
      />

      <View style={{ gap: theme.spacing(2) }}>
        <Field
          label={t('entryForm.volumeEachLabel')}
          value={volumeText}
          onChangeText={setVolumeText}
          keyboardType="decimal-pad"
          suffix={settings.volumeUnit}
          hint={volumeInvalid ? t('entryForm.volumeHint') : undefined}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: theme.spacing(2) }}
        >
          {commonVolumesMl(initial.category).map((preset) => (
            <Chip
              key={preset}
              label={formatVolume(preset, settings.volumeUnit)}
              selected={Math.abs(preset - volumeMl) < 0.5}
              onPress={() => setVolumeText(`${volumeInUnit(preset, settings.volumeUnit)}`)}
            />
          ))}
        </ScrollView>
      </View>

      <View style={{ flexDirection: 'row', gap: theme.spacing(3) }}>
        <Field
          label={t('common.strengthLabel')}
          value={abvText}
          onChangeText={setAbvText}
          keyboardType="decimal-pad"
          suffix="%"
          containerStyle={{ flex: 1 }}
          hint={abvInvalid ? t('entryForm.strengthHint') : undefined}
        />
        <Field
          label={t('entryForm.priceLabel')}
          value={priceText}
          onChangeText={setPriceText}
          keyboardType="decimal-pad"
          prefix={currencySymbol(settings.currency)}
          placeholder="—"
          containerStyle={{ flex: 1 }}
        />
      </View>

      <DateTimeField value={consumedAt} onChange={setConsumedAt} />

      <Field
        label={t('entryForm.whereLabel')}
        value={location}
        onChangeText={setLocation}
        placeholder={t('entryForm.wherePlaceholder')}
      />

      <Field
        label={t('entryForm.noteLabel')}
        value={note}
        onChangeText={setNote}
        placeholder={t('entryForm.notePlaceholder')}
        multiline
        style={{ minHeight: 72, textAlignVertical: 'top' }}
      />

      <Button label={submitLabel} size="lg" onPress={submit} disabled={!canSubmit} loading={saving} />

      {onDelete ? (
        <View style={{ gap: theme.spacing(1), alignItems: 'center' }}>
          <Button
            label={t('entryForm.deleteAction')}
            variant="destructive"
            onPress={onDelete}
            haptic={false}
          />
          {deleteHint ? (
            <Text variant="caption" tone="faint" center>
              {deleteHint}
            </Text>
          ) : null}
        </View>
      ) : null}
    </ScrollView>
  );
}

/** Accepts both "4.5" and "4,5" — decimal commas are the norm in much of Europe. */
function parseNumber(text: string): number | null {
  const normalized = text.replace(',', '.').trim();
  if (normalized === '') return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}
