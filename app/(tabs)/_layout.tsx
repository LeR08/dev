import { Tabs } from 'expo-router';
import React from 'react';
import type { ColorValue } from 'react-native';

import { Icon, type IconName } from '@/components/ui/Icon';
import { useTranslation } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/ThemeProvider';

export default function TabsLayout() {
  const theme = useTheme();
  const { t } = useTranslation();

  const icon =
    (name: IconName) =>
    ({ color, focused }: { color: ColorValue; focused: boolean }) => (
      <Icon name={name} color={color} size={22} strokeWidth={focused ? 2.1 : 1.7} />
    );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.accent.base,
        tabBarInactiveTintColor: theme.colors.textFaint,
        // The navigator sizes the bar itself (it accounts for the device safe
        // area); the icon and label are kept small enough to fit that height
        // without the label being squeezed away.
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
        tabBarIconStyle: { height: 22 },
        sceneStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('tabs.today'), tabBarIcon: icon('glass') }} />
      <Tabs.Screen name="history" options={{ title: t('tabs.history'), tabBarIcon: icon('list') }} />
      <Tabs.Screen name="insights" options={{ title: t('tabs.insights'), tabBarIcon: icon('chart') }} />
      <Tabs.Screen name="help" options={{ title: t('help.tabLabel'), tabBarIcon: icon('lifebuoy') }} />
      <Tabs.Screen name="settings" options={{ title: t('tabs.settings'), tabBarIcon: icon('sliders') }} />
    </Tabs>
  );
}
