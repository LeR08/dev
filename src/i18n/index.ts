import { LANGUAGES, RTL_LANGUAGES, type LanguageCode } from '@/domain/types';
import ar from './locales/ar.json';
import de from './locales/de.json';
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import it from './locales/it.json';
import pt from './locales/pt.json';
import zh from './locales/zh.json';
import type { Catalog, NestedKeyOf } from './translate';

export const CATALOGS: Record<LanguageCode, Catalog> = { en, fr, es, de, it, pt, zh, ar };

/** The canonical shape every catalog is validated against — see i18n.test.ts. */
export type TranslationKey = NestedKeyOf<typeof en>;

/** Each language's own name for itself, as shown in the picker. */
export const LANGUAGE_NAMES: Record<LanguageCode, string> = {
  en: 'English',
  fr: 'Français',
  es: 'Español',
  de: 'Deutsch',
  it: 'Italiano',
  pt: 'Português',
  zh: '中文',
  ar: 'العربية',
};

export function isRtl(language: LanguageCode): boolean {
  return (RTL_LANGUAGES as readonly LanguageCode[]).includes(language);
}

export { LANGUAGES };
export type { LanguageCode };
