import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Platform, View } from 'react-native';

import { EntryForm, type EntryFormValues } from '@/components/EntryForm';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { catalogDrinkName } from '@/i18n/catalogNames';
import { useTranslation } from '@/i18n/I18nProvider';
import { useApp } from '@/state/AppProvider';
import { useTheme } from '@/theme/ThemeProvider';

export default function LogDetailsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t, language } = useTranslation();
  const { drinkId } = useLocalSearchParams<{ drinkId?: string }>();
  const { drinks, settings, addEntry, removeEntry } = useApp();
  const toast = useToast();

  const drink = useMemo(() => drinks.find((item) => item.id === drinkId), [drinkId, drinks]);

  if (!drink) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing(8) }}>
        <Text variant="body" tone="muted" center>
          {t('logDetails.unavailable')}
        </Text>
      </View>
    );
  }

  const initial: EntryFormValues = {
    drinkId: drink.id,
    name: catalogDrinkName(language, drink),
    category: drink.category,
    abv: drink.abv,
    volumeMl: drink.defaultVolumeMl,
    quantity: 1,
    price: drink.defaultPrice,
    consumedAt: Date.now(),
    note: null,
    location: null,
  };

  return (
    <EntryForm
      initial={initial}
      settings={settings}
      submitLabel={t('logDetails.submitAction')}
      onSubmit={async (input) => {
        const entry = await addEntry(input);
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        }
        // Back past the picker, straight to where the flow started.
        if (router.canDismiss()) {
          router.dismissAll();
        } else {
          router.replace('/');
        }
        toast.show({
          message: t('logDetails.loggedToast', { name: entry.name }),
          action: { label: t('logDetails.undoAction'), onPress: () => void removeEntry(entry.id).catch(() => {}) },
        });
      }}
    />
  );
}
