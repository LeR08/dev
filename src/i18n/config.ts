export const LOCALES = ['en', 'nl', 'de', 'fr'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

/** Shown in the language switcher, in each language's own words. */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  nl: 'Nederlands',
  de: 'Deutsch',
  fr: 'Français',
};

/** BCP 47 tags for `hreflang` and for `Intl` formatting. */
export const LOCALE_TAGS: Record<Locale, string> = {
  en: 'en-GB',
  nl: 'nl-NL',
  de: 'de-DE',
  fr: 'fr-FR',
};

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/** Weekday names come from Intl rather than the dictionaries — never translated by hand. */
export function dayNames(locale: Locale): string[] {
  const formatter = new Intl.DateTimeFormat(LOCALE_TAGS[locale], { weekday: 'long' });
  // 2024-01-07 is a Sunday, matching index 0 of our weekly arrays.
  return Array.from({ length: 7 }, (_, day) =>
    formatter.format(new Date(Date.UTC(2024, 0, 7 + day))),
  );
}

export function formatDate(iso: string, locale: Locale): string {
  return new Date(iso).toLocaleDateString(LOCALE_TAGS[locale], {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Amsterdam',
  });
}

/** Replaces `{name}` placeholders. Dictionaries hold data, never functions, so
 *  a server component can hand one straight to a client component. */
export function format(template: string, values: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    key in values ? String(values[key]) : match,
  );
}

/** Picks the plural form the locale's own rules call for. */
export function plural(
  forms: { one: string; other: string },
  count: number,
  locale: Locale,
): string {
  const rule = new Intl.PluralRules(LOCALE_TAGS[locale]).select(count);
  return format(rule === 'one' ? forms.one : forms.other, { count });
}
