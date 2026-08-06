import * as Haptics from 'expo-haptics';
import { useCallback } from 'react';
import { Platform } from 'react-native';

import { useToast } from '@/components/ui/Toast';
import type { Drink, Entry, EntryInput } from '@/domain/types';
import { catalogDrinkName } from '@/i18n/catalogNames';
import { useTranslation } from '@/i18n/I18nProvider';
import { useApp } from '@/state/AppProvider';

export type QuickLogOverrides = Partial<Omit<EntryInput, 'drinkId' | 'category'>>;

/** Builds a log entry from a drink preset, snapshotting its values. */
export function entryInputFromDrink(drink: Drink, overrides: QuickLogOverrides = {}): EntryInput {
  return {
    drinkId: drink.id,
    name: overrides.name ?? drink.name,
    category: drink.category,
    abv: overrides.abv ?? drink.abv,
    volumeMl: overrides.volumeMl ?? drink.defaultVolumeMl,
    quantity: overrides.quantity ?? 1,
    price: overrides.price === undefined ? drink.defaultPrice : overrides.price,
    consumedAt: overrides.consumedAt ?? Date.now(),
    note: overrides.note ?? null,
    location: overrides.location ?? null,
  };
}

/**
 * One-tap logging with an undo affordance.
 *
 * Logging is instant and reversible rather than guarded by a confirmation
 * dialog — the whole point is that recording a drink should cost nothing.
 */
export function useQuickLog() {
  const { addEntry, removeEntry } = useApp();
  const toast = useToast();
  const { t, language } = useTranslation();

  return useCallback(
    async (drink: Drink, overrides?: QuickLogOverrides): Promise<Entry> => {
      const input = entryInputFromDrink(drink, overrides);
      // Snapshot the name the user actually saw in the picker, same as every
      // other field — a later language switch never rewrites past entries.
      if (!overrides?.name) input.name = catalogDrinkName(language, drink);
      const entry = await addEntry(input);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      toast.show({
        message: t('logDetails.loggedToast', { name: entry.name }),
        action: {
          label: t('logDetails.undoAction'),
          onPress: () => {
            removeEntry(entry.id).catch(() => {});
          },
        },
      });
      return entry;
    },
    [addEntry, language, removeEntry, t, toast]
  );
}
