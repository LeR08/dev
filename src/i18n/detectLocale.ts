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
  CA: 'CA',
};

/** Picks the Help & resources country on first launch (spec v1.2 §8.1). */
export function detectResourceCountry(regionCode: string | null | undefined): ResourceCountry {
  if (!regionCode) return 'OTHER';
  return REGION_TO_COUNTRY[regionCode.toUpperCase()] ?? 'OTHER';
}
