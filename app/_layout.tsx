import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/Text';
import { ToastProvider } from '@/components/ui/Toast';
import { I18nProvider, useTranslation } from '@/i18n/I18nProvider';
import { AppProvider, useApp } from '@/state/AppProvider';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';

SplashScreen.preventAutoHideAsync().catch(() => {
  // Not fatal: the splash screen simply hides on its own schedule.
});

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProvider>
          <I18nProvider>
            <ThemeProvider>
              <ToastProvider>
                <Boot />
              </ToastProvider>
            </ThemeProvider>
          </I18nProvider>
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/** Holds the splash until local data is open, then routes onboarding vs. app. */
function Boot() {
  const { status, error, settings } = useApp();
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const segments = useSegments();

  const onboarded = settings.onboardingCompletedAt !== null;
  const inOnboarding = segments[0] === 'onboarding';

  useEffect(() => {
    if (status === 'ready') {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [status]);

  useEffect(() => {
    if (status !== 'ready') return;
    if (!onboarded && !inOnboarding) {
      router.replace('/onboarding');
    } else if (onboarded && inOnboarding) {
      router.replace('/');
    }
  }, [inOnboarding, onboarded, router, status]);

  if (status === 'error') {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          gap: theme.spacing(2),
          padding: theme.spacing(8),
          backgroundColor: theme.colors.background,
        }}
      >
        <Text variant="heading" center>
          {t('common.dataOpenError')}
        </Text>
        <Text variant="body" tone="muted" center>
          {error ?? t('common.dataOpenErrorFallback')}
        </Text>
      </View>
    );
  }

  if (status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator color={theme.accent.base} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerTitleStyle: { fontSize: theme.type.heading.fontSize, fontWeight: '600' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen
          name="log/index"
          options={{ title: t('nav.addDrink'), presentation: 'modal' }}
        />
        <Stack.Screen name="log/details" options={{ title: t('nav.details') }} />
        <Stack.Screen name="entry/[id]" options={{ title: t('nav.editEntry'), presentation: 'modal' }} />
        <Stack.Screen name="drinks/index" options={{ title: t('nav.myDrinks') }} />
        <Stack.Screen name="drinks/edit" options={{ title: t('nav.customDrink'), presentation: 'modal' }} />
        <Stack.Screen name="settings/units" options={{ title: t('nav.units') }} />
        <Stack.Screen name="settings/goals" options={{ title: t('nav.personalGoals') }} />
        <Stack.Screen name="settings/appearance" options={{ title: t('nav.appearance') }} />
        <Stack.Screen name="settings/prices" options={{ title: t('nav.defaultPrices') }} />
        <Stack.Screen name="settings/data" options={{ title: t('nav.dataPrivacy') }} />
        <Stack.Screen name="settings/subscription" options={{ title: t('nav.subscription') }} />
        <Stack.Screen name="settings/admin" options={{ title: t('nav.admin') }} />
        <Stack.Screen name="settings/profile" options={{ title: t('settings.profile.title') }} />
        <Stack.Screen name="settings/language" options={{ title: t('settings.language.title') }} />
        <Stack.Screen name="settings/legal/[doc]" options={{ title: '' }} />
        <Stack.Screen name="settings/report" options={{ title: t('tickets.reportTitle'), presentation: 'modal' }} />
        <Stack.Screen name="settings/tickets" options={{ title: t('tickets.myTicketsTitle') }} />
        <Stack.Screen name="savings" options={{ title: t('savings.title') }} />
      </Stack>
    </>
  );
}
