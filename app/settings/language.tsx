import React from 'react';
import { View } from 'react-native';

import { LanguagePickerGrid } from '@/components/ui/LanguagePickerGrid';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useTranslation } from '@/i18n/I18nProvider';
import { useApp } from '@/state/AppProvider';
import { useTheme } from '@/theme/ThemeProvider';

export default function LanguageScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { settings, updateSettings } = useApp();

  return (
    <Screen>
      <View style={{ gap: theme.spacing(5), paddingTop: theme.spacing(4) }}>
        <Text variant="body" tone="muted">
          {t('settings.language.intro')}
        </Text>
        <LanguagePickerGrid
          selected={settings.language}
          onSelect={(language) => void updateSettings({ language })}
        />
      </View>
    </Screen>
  );
}
