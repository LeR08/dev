import { COMPLETE_LANGUAGES, LANGUAGES, type LanguageCode } from '@/domain/types';
import de from './locales/de.json';
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import it from './locales/it.json';
import pt from './locales/pt.json';
import type { Catalog, NestedKeyOf } from './translate';

export const CATALOGS: Record<LanguageCode, Catalog> = { en, fr, es, de, it, pt };

/** The canonical shape every catalog is validated against — see i18n.test.ts. */
export type TranslationKey = NestedKeyOf<typeof en>;

export const LANGUAGE_NAMES: Record<LanguageCode, string> = {
  en: 'English',
  fr: 'Français',
  es: 'Español',
  de: 'Deutsch',
  it: 'Italiano',
  pt: 'Português',
};

export function isLanguageComplete(language: LanguageCode): boolean {
  return (COMPLETE_LANGUAGES as readonly LanguageCode[]).includes(language);
}

export { LANGUAGES };
export type { LanguageCode };
