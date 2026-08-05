import React from 'react';
import { View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Row, RowDivider } from '@/components/ui/Row';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { LANGUAGES } from '@/domain/types';
import { isLanguageComplete, LANGUAGE_NAMES } from '@/i18n';
import { useTranslation } from '@/i18n/I18nProvider';
import { useApp } from '@/state/AppProvider';
import { useTheme } from '@/theme/ThemeProvider';

export default function LanguageScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { settings, updateSettings } = useApp();

  return (
    <Screen>
      <View style={{ gap: theme.spacing(4), paddingTop: theme.spacing(4) }}>
        <Text variant="body" tone="muted">
          {t('settings.language.intro')}
        </Text>

        <Card padded={false} style={{ paddingHorizontal: theme.spacing(4) }}>
          {LANGUAGES.map((language, index) => {
            const complete = isLanguageComplete(language);
            return (
              <View key={language}>
                {index > 0 ? <RowDivider /> : null}
                <Row
                  title={LANGUAGE_NAMES[language]}
                  subtitle={complete ? undefined : t('common.beta')}
                  value={settings.language === language ? '✓' : undefined}
                  onPress={() => updateSettings({ language })}
                />
              </View>
            );
          })}
        </Card>

        <Text variant="caption" tone="faint">
          {t('settings.language.incompleteNotice')}
        </Text>
      </View>
    </Screen>
  );
}
