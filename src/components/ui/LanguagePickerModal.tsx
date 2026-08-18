import React from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LanguagePickerGrid } from '@/components/ui/LanguagePickerGrid';
import { Text } from '@/components/ui/Text';
import type { LanguageCode } from '@/domain/types';
import { useTranslation } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/ThemeProvider';

export type LanguagePickerModalProps = {
  visible: boolean;
  selected: LanguageCode;
  onSelect: (language: LanguageCode) => void;
  onDismiss: () => void;
};

/**
 * Bottom-sheet-style language picker for screens reached before there's
 * anywhere else to navigate to — the mandatory auth gate is the one case
 * today (app/auth-gate.tsx), since Boot()'s redirect in app/_layout.tsx
 * bounces any route back to /auth-gate while signed out, so pushing
 * /settings/language from there would just be reverted immediately.
 * Picking a language here closes the sheet but doesn't navigate anywhere —
 * the surrounding screen re-renders in the new language on its own, since
 * `settings.language` is global app state every screen already reads from.
 */
export function LanguagePickerModal({ visible, selected, onSelect, onDismiss }: LanguagePickerModalProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onDismiss}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('common.close')}
        onPress={onDismiss}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}
      >
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={{
            backgroundColor: theme.colors.background,
            borderTopLeftRadius: theme.radius.xl,
            borderTopRightRadius: theme.radius.xl,
            paddingHorizontal: theme.spacing(5),
            paddingTop: theme.spacing(5),
            paddingBottom: insets.bottom + theme.spacing(5),
            gap: theme.spacing(4),
            maxHeight: '80%',
          }}
        >
          <View
            style={{
              alignSelf: 'center',
              width: 36,
              height: 4,
              borderRadius: 2,
              backgroundColor: theme.colors.trackEmpty,
            }}
          />
          <Text variant="heading">{t('settings.language.title')}</Text>
          <LanguagePickerGrid
            selected={selected}
            animated={false}
            onSelect={(language) => {
              onSelect(language);
              onDismiss();
            }}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
