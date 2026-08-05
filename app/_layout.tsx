import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/Text';
import { ToastProvider } from '@/components/ui/Toast';
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
          <ThemeProvider>
            <ToastProvider>
              <Boot />
            </ToastProvider>
          </ThemeProvider>
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/** Holds the splash until local data is open, then routes onboarding vs. app. */
function Boot() {
  const { status, error, settings } = useApp();
  const theme = useTheme();
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
          Your data could not be opened
        </Text>
        <Text variant="body" tone="muted" center>
          {error ?? 'Something went wrong reading the local database.'}
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
          options={{ title: 'Add a drink', presentation: 'modal' }}
        />
        <Stack.Screen name="log/details" options={{ title: 'Details' }} />
        <Stack.Screen name="entry/[id]" options={{ title: 'Edit entry', presentation: 'modal' }} />
        <Stack.Screen name="drinks/index" options={{ title: 'My drinks' }} />
        <Stack.Screen name="drinks/edit" options={{ title: 'Custom drink', presentation: 'modal' }} />
        <Stack.Screen name="settings/units" options={{ title: 'Units' }} />
        <Stack.Screen name="settings/goals" options={{ title: 'Personal goals' }} />
        <Stack.Screen name="settings/appearance" options={{ title: 'Appearance' }} />
        <Stack.Screen name="settings/prices" options={{ title: 'Default prices' }} />
        <Stack.Screen name="settings/data" options={{ title: 'Data & privacy' }} />
      </Stack>
    </>
  );
}
