import { useLocalSearchParams, useNavigation } from 'expo-router';
import React, { useLayoutEffect } from 'react';
import { View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { legalDoc, type LegalDocId } from '@/data/legal/content';
import { useTranslation } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * One screen for all three legal documents (spec v1.2 §10) — same layout,
 * different static content, so there is nothing to keep in sync across three
 * near-identical files.
 */
export default function LegalDocScreen() {
  const theme = useTheme();
  const { t, language } = useTranslation();
  const navigation = useNavigation();
  const { doc } = useLocalSearchParams<{ doc: LegalDocId }>();

  const content = legalDoc(language, doc);

  useLayoutEffect(() => {
    navigation.setOptions({ title: content.title });
  }, [content.title, navigation]);

  return (
    <Screen>
      <View style={{ gap: theme.spacing(4), paddingTop: theme.spacing(4) }}>
        <Card tone="muted" style={{ gap: theme.spacing(1) }}>
          <Text variant="caption" tone="muted" overline>
            {t('legal.notFinalNotice')}
          </Text>
        </Card>

        <Text variant="body" tone="muted">
          {content.intro}
        </Text>

        {content.sections.map((section) => (
          <View key={section.heading} style={{ gap: theme.spacing(1.5) }}>
            <Text variant="heading">{section.heading}</Text>
            {section.body.map((paragraph, index) => (
              <Text key={index} variant="body" tone="muted">
                {paragraph}
              </Text>
            ))}
          </View>
        ))}
      </View>
    </Screen>
  );
}
