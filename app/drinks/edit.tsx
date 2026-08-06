import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, Platform, ScrollView, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Field } from '@/components/ui/Field';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { clToMl, gramsToIntake, pureAlcoholGrams } from '@/domain/alcohol';
import { currencySymbol, volumeInUnit } from '@/domain/format';
import { CATEGORIES, type Category } from '@/domain/types';
import { categoryLabel } from '@/i18n/categoryLabel';
import { formatIntakeLabel } from '@/i18n/formatIntakeLabel';
import { useTranslation } from '@/i18n/I18nProvider';
import { useApp } from '@/state/AppProvider';
import { useTheme } from '@/theme/ThemeProvider';

export default function EditDrinkScreen() {
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { drinks, settings, addDrink, editDrink, removeDrink } = useApp();

  const existing = useMemo(() => drinks.find((drink) => drink.id === id), [drinks, id]);

  const [name, setName] = useState(existing?.name ?? '');
  const [category, setCategory] = useState<Category>(existing?.category ?? 'beer');
  const [abvText, setAbvText] = useState(existing ? `${existing.abv}` : '5');
  const [volumeText, setVolumeText] = useState(
    existing ? `${volumeInUnit(existing.defaultVolumeMl, settings.volumeUnit)}` : ''
  );
  const [priceText, setPriceText] = useState(
    existing?.defaultPrice != null ? `${existing.defaultPrice}` : ''
  );
  const [saving, setSaving] = useState(false);

  const abv = parseNumber(abvText) ?? 0;
  const volumeValue = parseNumber(volumeText);
  const volumeMl =
    volumeValue === null ? 0 : settings.volumeUnit === 'cl' ? clToMl(volumeValue) : volumeValue;
  const price = parseNumber(priceText);

  const nameValid = name.trim().length > 0;
  const abvValid = abv >= 0 && abv <= 100;
  const volumeValid = volumeMl > 0;
  const canSave = nameValid && abvValid && volumeValid && !saving;

  const preview = gramsToIntake(
    pureAlcoholGrams(volumeMl, abv),
    settings.intakeUnit,
    settings.standardDrinkGrams
  );

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const input = {
        name: name.trim(),
        category,
        abv,
        defaultVolumeMl: volumeMl,
        defaultPrice: price,
      };
      if (existing) {
        await editDrink(existing.id, input);
        toast.show({ message: t('drinkEdit.updatedToast', { name: input.name }) });
      } else {
        await addDrink(input);
        toast.show({ message: t('drinkEdit.addedToast', { name: input.name }) });
      }
      router.back();
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    if (!existing) return;
    const remove = async () => {
      await removeDrink(existing.id);
      router.back();
      toast.show({ message: t('drinkEdit.deletedToast') });
    };

    if (Platform.OS === 'web') {
      void remove();
      return;
    }
    Alert.alert(
      t('drinkEdit.deleteConfirmTitle', { name: existing.name }),
      t('drinkEdit.deleteConfirmBody'),
      [
        { text: t('common.keep'), style: 'cancel' },
        { text: t('common.delete'), style: 'destructive', onPress: () => void remove() },
      ]
    );
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
      <Field
        label={t('drinkEdit.nameLabel')}
        value={name}
        onChangeText={setName}
        placeholder={t('drinkEdit.namePlaceholder')}
        autoFocus={!existing}
      />

      <View style={{ gap: theme.spacing(2) }}>
        <Text variant="caption" tone="muted" overline>
          {t('common.categoryLabel')}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing(2) }}>
          {CATEGORIES.map((item) => (
            <Chip
              key={item}
              label={categoryLabel(t, item)}
              dotColor={theme.categoryColor(item)}
              selected={category === item}
              onPress={() => setCategory(item)}
            />
          ))}
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: theme.spacing(3) }}>
        <Field
          label={t('common.strengthLabel')}
          value={abvText}
          onChangeText={setAbvText}
          keyboardType="decimal-pad"
          suffix="%"
          containerStyle={{ flex: 1 }}
          hint={abvValid ? undefined : t('drinkEdit.strengthHint')}
        />
        <Field
          label={t('drinkEdit.volumeLabel')}
          value={volumeText}
          onChangeText={setVolumeText}
          keyboardType="decimal-pad"
          suffix={settings.volumeUnit}
          containerStyle={{ flex: 1 }}
          placeholder={settings.volumeUnit === 'cl' ? '25' : '250'}
          hint={volumeValid || volumeText === '' ? undefined : t('drinkEdit.volumeHint')}
        />
      </View>

      <Field
        label={t('drinkEdit.priceLabel')}
        value={priceText}
        onChangeText={setPriceText}
        keyboardType="decimal-pad"
        prefix={currencySymbol(settings.currency)}
        placeholder="—"
        hint={t('drinkEdit.priceHint')}
      />

      {volumeValid ? (
        <Text variant="caption" tone="muted">
          {t('drinkEdit.servingPreview', { intake: formatIntakeLabel(t, preview, settings.intakeUnit) })}
        </Text>
      ) : null}

      <Button
        label={existing ? t('common.saveChanges') : t('drinkEdit.addAction')}
        size="lg"
        onPress={save}
        disabled={!canSave}
        loading={saving}
      />

      {existing ? (
        <Button
          label={t('drinkEdit.deleteAction')}
          variant="destructive"
          onPress={confirmDelete}
          haptic={false}
        />
      ) : null}
    </ScrollView>
  );
}

function parseNumber(text: string): number | null {
  const normalized = text.replace(',', '.').trim();
  if (normalized === '') return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}
