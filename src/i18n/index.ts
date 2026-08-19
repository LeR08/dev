import { en } from '@/i18n/dictionaries/en';
import { nl } from '@/i18n/dictionaries/nl';
import { de } from '@/i18n/dictionaries/de';
import { fr } from '@/i18n/dictionaries/fr';
import type { Locale } from '@/i18n/config';

export type { Dictionary } from '@/i18n/dictionaries/en';

const DICTIONARIES = { en, nl, de, fr };

export function getDictionary(locale: Locale) {
  return DICTIONARIES[locale];
}
