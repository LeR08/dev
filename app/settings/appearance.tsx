import React from 'react';
import { Pressable, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Segmented } from '@/components/ui/Segmented';
import { Text } from '@/components/ui/Text';
import type { AccentName, ThemeMode } from '@/domain/types';
import { useTranslation } from '@/i18n/I18nProvider';
import { useApp } from '@/state/AppProvider';
import { ACCENTS } from '@/theme/palette';
import { useTheme } from '@/theme/ThemeProvider';

export default function AppearanceScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { settings, updateSettings } = useApp();

  const accentNames = Object.keys(ACCENTS) as AccentName[];

  return (
    <Screen>
      <View style={{ gap: theme.spacing(5), paddingTop: theme.spacing(4) }}>
        <View style={{ gap: theme.spacing(2) }}>
          <Text variant="caption" tone="muted" overline>
            {t('appearanceScreen.themeTitle')}
          </Text>
          <Segmented<ThemeMode>
            options={[
              { value: 'system', label: t('appearanceScreen.system') },
              { value: 'light', label: t('appearanceScreen.light') },
              { value: 'dark', label: t('appearanceScreen.dark') },
            ]}
            value={settings.themeMode}
            onChange={(themeMode) => updateSettings({ themeMode })}
          />
        </View>

        <View style={{ gap: theme.spacing(2) }}>
          <Text variant="caption" tone="muted" overline>
            {t('appearanceScreen.accentTitle')}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing(3) }}>
            {accentNames.map((name) => {
              const selected = settings.accent === name;
              const swatch = ACCENTS[name][theme.mode];
              const accentName = t(`accents.${name}` as never);
              return (
                <Pressable
                  key={name}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={accentName}
                  onPress={() => updateSettings({ accent: name })}
                  style={({ pressed }) => ({
                    alignItems: 'center',
                    gap: theme.spacing(1.5),
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <View
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 26,
                      backgroundColor: swatch.base,
                      borderWidth: selected ? 3 : 1,
                      borderColor: selected ? theme.colors.text : theme.colors.border,
                    }}
                  />
                  <Text variant="caption" tone={selected ? 'default' : 'muted'}>
                    {accentName}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Card tone="accent" style={{ gap: theme.spacing(1) }}>
          <Text variant="caption" tone="accent" overline>
            {t('appearanceScreen.previewTitle')}
          </Text>
          <Text variant="title">{t('appearanceScreen.previewStreak')}</Text>
          <Text variant="body" tone="muted">
            {t('appearanceScreen.previewBody')}
          </Text>
        </Card>
      </View>
    </Screen>
  );
}
