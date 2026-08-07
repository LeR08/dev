import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/manrope';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SupportInterstitial } from '@/components/SupportInterstitial';
import { Text } from '@/components/ui/Text';
import { ToastProvider } from '@/components/ui/Toast';
import { I18nProvider, useTranslation } from '@/i18n/I18nProvider';
import { AppProvider, useApp } from '@/state/AppProvider';
import { isFirebaseConfigured } from '@/sync/firebaseApp';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';

// Module scope so it naturally resets on each fresh app process launch, and
// stays put across in-app navigation within the same launch.
let supportInterstitialShownThisLaunch = false;

SplashScreen.preventAutoHideAsync().catch(() => {
  // Not fatal: the splash screen simply hides on its own schedule.
});

export default function RootLayout() {
  // Manrope is a discrete-weight font (see theme.ts) — every weight it needs
  // has to be loaded before anything renders, or text would flash from the
  // system font to Manrope. Fonts are bundled, not fetched, so this adds no
  // real delay; the native splash screen (held open above) covers it.
  const [fontsLoaded, fontError] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  if (!fontsLoaded && !fontError) {
    return null;
  }

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
  const [supportInterstitialVisible, setSupportInterstitialVisible] = useState(false);

  // Account creation is mandatory: nobody reaches onboarding or the app
  // itself without a signed-in Firebase account first. The one exception is
  // a build with no Firebase project configured at all (isFirebaseConfigured()
  // false, e.g. local development without a .env) — there's no account
  // system to gate behind in that case, so it falls back to the previous
  // local-only behavior rather than locking the app out entirely.
  const authRequired = isFirebaseConfigured();
  const authed = !authRequired || settings.account !== null;
  const inAuthGate = segments[0] === 'auth-gate';

  useEffect(() => {
    if (status === 'ready') {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [status]);

  useEffect(() => {
    if (status !== 'ready') return;
    if (!authed) {
      if (!inAuthGate) router.replace('/auth-gate');
      return;
    }
    if (!onboarded) {
      if (!inOnboarding) router.replace('/onboarding');
      return;
    }
    if (inAuthGate || inOnboarding) router.replace('/');
  }, [authed, inAuthGate, inOnboarding, onboarded, router, status]);

  // A light, skippable, self-authored message (never a real ad-network ad —
  // see SupportInterstitial) shown once per app launch to free-tier users
  // only, once onboarding is behind them.
  useEffect(() => {
    if (status !== 'ready' || !onboarded || inOnboarding) return;
    if (settings.subscription.status === 'active') return;
    if (supportInterstitialShownThisLaunch) return;
    supportInterstitialShownThisLaunch = true;
    setSupportInterstitialVisible(true);
  }, [inOnboarding, onboarded, settings.subscription.status, status]);

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
          headerTitleStyle: {
            fontSize: theme.type.heading.fontSize,
            fontWeight: '600',
            fontFamily: theme.type.heading.fontFamily,
          },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth-gate" options={{ headerShown: false, animation: 'fade', gestureEnabled: false }} />
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
        <Stack.Screen name="settings/profile" options={{ title: t('settings.profile.title') }} />
        <Stack.Screen name="settings/language" options={{ title: t('settings.language.title') }} />
        <Stack.Screen name="settings/legal/[doc]" options={{ title: '' }} />
        <Stack.Screen name="settings/report" options={{ title: t('tickets.reportTitle'), presentation: 'modal' }} />
        <Stack.Screen name="settings/tickets" options={{ title: t('tickets.myTicketsTitle') }} />
        <Stack.Screen name="savings" options={{ title: t('savings.title') }} />
      </Stack>
      <SupportInterstitial
        visible={supportInterstitialVisible}
        onDismiss={() => setSupportInterstitialVisible(false)}
      />
    </>
  );
}
