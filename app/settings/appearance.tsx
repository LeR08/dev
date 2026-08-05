import React from 'react';
import { Pressable, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Segmented } from '@/components/ui/Segmented';
import { Text } from '@/components/ui/Text';
import type { AccentName, ThemeMode } from '@/domain/types';
import { useApp } from '@/state/AppProvider';
import { ACCENTS } from '@/theme/palette';
import { useTheme } from '@/theme/ThemeProvider';

export default function AppearanceScreen() {
  const theme = useTheme();
  const { settings, updateSettings } = useApp();

  const accentNames = Object.keys(ACCENTS) as AccentName[];

  return (
    <Screen>
      <View style={{ gap: theme.spacing(5), paddingTop: theme.spacing(4) }}>
        <View style={{ gap: theme.spacing(2) }}>
          <Text variant="caption" tone="muted" overline>
            Theme
          </Text>
          <Segmented<ThemeMode>
            options={[
              { value: 'system', label: 'System' },
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
            value={settings.themeMode}
            onChange={(themeMode) => updateSettings({ themeMode })}
          />
        </View>

        <View style={{ gap: theme.spacing(2) }}>
          <Text variant="caption" tone="muted" overline>
            Accent
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing(3) }}>
            {accentNames.map((name) => {
              const selected = settings.accent === name;
              const swatch = ACCENTS[name][theme.mode];
              return (
                <Pressable
                  key={name}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={ACCENTS[name].label}
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
                    {ACCENTS[name].label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Card tone="accent" style={{ gap: theme.spacing(1) }}>
          <Text variant="caption" tone="accent" overline>
            Preview
          </Text>
          <Text variant="title">7 alcohol-free days</Text>
          <Text variant="body" tone="muted">
            This is how the streak card will look.
          </Text>
        </Card>
      </View>
    </Screen>
  );
}
