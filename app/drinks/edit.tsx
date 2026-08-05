import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, Platform, ScrollView, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Field } from '@/components/ui/Field';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { clToMl, gramsToIntake, pureAlcoholGrams } from '@/domain/alcohol';
import { currencySymbol, formatIntake, volumeInUnit } from '@/domain/format';
import { CATEGORIES, CATEGORY_LABELS, type Category } from '@/domain/types';
import { useApp } from '@/state/AppProvider';
import { useTheme } from '@/theme/ThemeProvider';

export default function EditDrinkScreen() {
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();
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
        toast.show({ message: `${input.name} updated` });
      } else {
        await addDrink(input);
        toast.show({ message: `${input.name} added to your drinks` });
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
      toast.show({ message: 'Preset deleted. Past entries are untouched.' });
    };

    if (Platform.OS === 'web') {
      void remove();
      return;
    }
    Alert.alert(
      `Delete ${existing.name}?`,
      'The preset is removed. Entries you already logged with it stay in your history.',
      [
        { text: 'Keep', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => void remove() },
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
        label="Name"
        value={name}
        onChangeText={setName}
        placeholder="Homemade panaché"
        autoFocus={!existing}
      />

      <View style={{ gap: theme.spacing(2) }}>
        <Text variant="caption" tone="muted" overline>
          Category
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing(2) }}>
          {CATEGORIES.map((item) => (
            <Chip
              key={item}
              label={CATEGORY_LABELS[item]}
              dotColor={theme.categoryColor(item)}
              selected={category === item}
              onPress={() => setCategory(item)}
            />
          ))}
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: theme.spacing(3) }}>
        <Field
          label="Strength"
          value={abvText}
          onChangeText={setAbvText}
          keyboardType="decimal-pad"
          suffix="%"
          containerStyle={{ flex: 1 }}
          hint={abvValid ? undefined : '0 to 100.'}
        />
        <Field
          label="Default volume"
          value={volumeText}
          onChangeText={setVolumeText}
          keyboardType="decimal-pad"
          suffix={settings.volumeUnit}
          containerStyle={{ flex: 1 }}
          placeholder={settings.volumeUnit === 'cl' ? '25' : '250'}
          hint={volumeValid || volumeText === '' ? undefined : 'Greater than zero.'}
        />
      </View>

      <Field
        label="Default price (optional)"
        value={priceText}
        onChangeText={setPriceText}
        keyboardType="decimal-pad"
        prefix={currencySymbol(settings.currency)}
        placeholder="—"
        hint="Pre-filled when you log this drink."
      />

      {volumeValid ? (
        <Text variant="caption" tone="muted">
          One serving ≈ {formatIntake(preview, settings.intakeUnit)}
        </Text>
      ) : null}

      <Button
        label={existing ? 'Save changes' : 'Add drink'}
        size="lg"
        onPress={save}
        disabled={!canSave}
        loading={saving}
      />

      {existing ? (
        <Button label="Delete preset" variant="destructive" onPress={confirmDelete} haptic={false} />
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
