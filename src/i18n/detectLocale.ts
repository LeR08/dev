import type { LanguageCode, ResourceCountry } from '@/domain/types';
import { LANGUAGES } from '@/domain/types';

/**
 * Picks the in-app language on first launch (spec v1.2 §3.2: "default on
 * first launch = device locale if supported, else English").
 *
 * Pure so it can be tested without touching expo-localization; the caller
 * passes in whatever `Localization.getLocales().map(l => l.languageCode)`
 * returns.
 */
export function detectLanguage(deviceLanguageCodes: (string | null | undefined)[]): LanguageCode {
  for (const code of deviceLanguageCodes) {
    const primary = code?.toLowerCase().split(/[-_]/)[0];
    const match = LANGUAGES.find((language) => language === primary);
    if (match) return match;
  }
  return 'en';
}

const REGION_TO_COUNTRY: Record<string, ResourceCountry> = {
  FR: 'FR',
  US: 'US',
  GB: 'GB',
  ES: 'ES',
  DE: 'DE',
  IT: 'IT',
  PT: 'PT',
  CN: 'CN',
};

/** Picks the Help & resources country on first launch (spec v1.2 §8.1). */
export function detectResourceCountry(regionCode: string | null | undefined): ResourceCountry {
  if (!regionCode) return 'OTHER';
  return REGION_TO_COUNTRY[regionCode.toUpperCase()] ?? 'OTHER';
}

/**
 * A reasonable currency guess from the device's region — replaces the
 * explicit currency step that used to be part of onboarding. Only covers
 * regions with a currency already offered in the picker (src/domain/format.ts);
 * everything else falls back to EUR, same as the app's original default.
 */
const REGION_TO_CURRENCY: Record<string, string> = {
  FR: 'EUR',
  DE: 'EUR',
  IT: 'EUR',
  ES: 'EUR',
  PT: 'EUR',
  NL: 'EUR',
  BE: 'EUR',
  IE: 'EUR',
  AT: 'EUR',
  FI: 'EUR',
  GR: 'EUR',
  GB: 'GBP',
  US: 'USD',
  CH: 'CHF',
  CA: 'CAD',
  AU: 'AUD',
  SE: 'SEK',
  NO: 'NOK',
  DK: 'DKK',
  PL: 'PLN',
  JP: 'JPY',
  CN: 'CNY',
  SA: 'SAR',
  AE: 'AED',
};

export function detectCurrency(regionCode: string | null | undefined): string {
  if (!regionCode) return 'EUR';
  return REGION_TO_CURRENCY[regionCode.toUpperCase()] ?? 'EUR';
}
