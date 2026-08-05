import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Alert, Platform, View } from 'react-native';

import { EntryForm, type EntryFormValues } from '@/components/EntryForm';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { useApp } from '@/state/AppProvider';
import { useTheme } from '@/theme/ThemeProvider';

export default function EditEntryScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { entries, settings, editEntry, removeEntry } = useApp();
  const toast = useToast();

  const entry = useMemo(() => entries.find((item) => item.id === id), [entries, id]);

  if (!entry) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing(8) }}>
        <Text variant="body" tone="muted" center>
          This entry no longer exists.
        </Text>
      </View>
    );
  }

  const initial: EntryFormValues = {
    drinkId: entry.drinkId,
    name: entry.name,
    category: entry.category,
    abv: entry.abv,
    volumeMl: entry.volumeMl,
    quantity: entry.quantity,
    price: entry.price,
    consumedAt: entry.consumedAt,
    note: entry.note,
    location: entry.location,
  };

  const confirmDelete = () => {
    const remove = async () => {
      await removeEntry(entry.id);
      router.back();
      toast.show({ message: 'Entry deleted' });
    };

    if (Platform.OS === 'web') {
      // Alert has no buttons on web; the toast below still confirms the action.
      void remove();
      return;
    }

    Alert.alert('Delete this entry?', 'It will be removed from your history.', [
      { text: 'Keep', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void remove() },
    ]);
  };

  return (
    <EntryForm
      initial={initial}
      settings={settings}
      submitLabel="Save changes"
      onSubmit={async (input) => {
        await editEntry(entry.id, input);
        router.back();
        toast.show({ message: 'Entry updated' });
      }}
      onDelete={confirmDelete}
      deleteHint="Deleting removes it from your charts too."
    />
  );
}
