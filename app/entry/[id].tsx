import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Alert, Platform, View } from 'react-native';

import { EntryForm, type EntryFormValues } from '@/components/EntryForm';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { useTranslation } from '@/i18n/I18nProvider';
import { useApp } from '@/state/AppProvider';
import { useTheme } from '@/theme/ThemeProvider';

export default function EditEntryScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { entries, settings, editEntry, removeEntry } = useApp();
  const toast = useToast();

  const entry = useMemo(() => entries.find((item) => item.id === id), [entries, id]);

  if (!entry) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing(8) }}>
        <Text variant="body" tone="muted" center>
          {t('entryScreen.notFound')}
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
      toast.show({ message: t('entryScreen.deletedToast') });
    };

    if (Platform.OS === 'web') {
      // Alert has no buttons on web; the toast below still confirms the action.
      void remove();
      return;
    }

    Alert.alert(t('entryScreen.deleteConfirmTitle'), t('entryScreen.deleteConfirmBody'), [
      { text: t('common.keep'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => void remove() },
    ]);
  };

  return (
    <EntryForm
      initial={initial}
      settings={settings}
      submitLabel={t('common.saveChanges')}
      onSubmit={async (input) => {
        await editEntry(entry.id, input);
        router.back();
        toast.show({ message: t('entryScreen.updatedToast') });
      }}
      onDelete={confirmDelete}
      deleteHint={t('entryScreen.deleteHint')}
    />
  );
}
