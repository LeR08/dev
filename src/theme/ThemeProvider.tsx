import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';

import { useSettings } from '@/state/AppProvider';
import { createTheme, type Mode, type Theme } from './theme';

const ThemeContext = createContext<Theme | null>(null);

/** Resolves the user's theme preference against the system scheme. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const settings = useSettings();
  const systemScheme = useColorScheme();

  const theme = useMemo(() => {
    const mode: Mode =
      settings.themeMode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : settings.themeMode;
    return createTheme(mode, settings.accent);
  }, [settings.accent, settings.themeMode, systemScheme]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme must be used inside <ThemeProvider>');
  return theme;
}

/**
 * Builds styles from the theme and memoises per theme identity.
 * Mirrors the ergonomics of StyleSheet.create without losing theme access.
 */
export function useThemedStyles<T>(factory: (theme: Theme) => T): T {
  const theme = useTheme();
  return useMemo(() => factory(theme), [factory, theme]);
}
