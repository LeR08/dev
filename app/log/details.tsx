import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Platform, View } from 'react-native';

import { EntryForm, type EntryFormValues } from '@/components/EntryForm';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { useApp } from '@/state/AppProvider';
import { useTheme } from '@/theme/ThemeProvider';

export default function LogDetailsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { drinkId } = useLocalSearchParams<{ drinkId?: string }>();
  const { drinks, settings, addEntry, removeEntry } = useApp();
  const toast = useToast();

  const drink = useMemo(() => drinks.find((item) => item.id === drinkId), [drinkId, drinks]);

  if (!drink) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing(8) }}>
        <Text variant="body" tone="muted" center>
          That drink is no longer available.
        </Text>
      </View>
    );
  }

  const initial: EntryFormValues = {
    drinkId: drink.id,
    name: drink.name,
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
      submitLabel="Add to log"
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
          message: `${entry.name} logged`,
          action: { label: 'Undo', onPress: () => void removeEntry(entry.id).catch(() => {}) },
        });
      }}
    />
  );
}
