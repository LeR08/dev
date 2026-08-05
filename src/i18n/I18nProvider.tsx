import React, { createContext, useCallback, useContext, useMemo } from 'react';

import { useSettings } from '@/state/AppProvider';
import { CATALOGS, isRtl, type TranslationKey } from './index';
import { translate } from './translate';

type I18nContextValue = {
  language: ReturnType<typeof useSettings>['language'];
  /** True for Arabic. Text itself renders correctly either way (React Native
   *  resolves bidi runs on its own) — this flag is for the handful of spots
   *  that mirror layout (e.g. leading/trailing icon order), not full RTL. */
  isRtl: boolean;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

/** Translates using the language in Settings, falling back to English for any missing key. */
export function I18nProvider({ children }: { children: React.ReactNode }) {
  const settings = useSettings();
  const language = settings.language;

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) =>
      translate(CATALOGS[language], CATALOGS.en, key, vars),
    [language]
  );

  const value = useMemo<I18nContextValue>(
    () => ({ language, isRtl: isRtl(language), t }),
    [language, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useTranslation must be used inside <I18nProvider>');
  return context;
}
