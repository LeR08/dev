import { DEFAULT_LOCALE, LOCALES, LOCALE_TAGS, type Locale } from '@/i18n/config';

export const SITE_NAME = 'The Smoke Trail';
export const SITE_TAGLINE = 'Licensed Amsterdam coffeeshops: where they are and when they are open';

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

/**
 * Canonical plus one `hreflang` per locale, which §8 requires for the
 * locale-prefixed routes. `x-default` points at English.
 */
export function alternatesFor(locale: Locale, path: string) {
  const suffix = path ? `/${path}` : '';
  return {
    canonical: `/${locale}${suffix}`,
    languages: {
      ...Object.fromEntries(LOCALES.map((entry) => [LOCALE_TAGS[entry], `/${entry}${suffix}`])),
      'x-default': `/${DEFAULT_LOCALE}${suffix}`,
    },
  };
}

/** L4: these strings must be visible on the map and on /about-data. */
export const TILE_ATTRIBUTION = '© OpenFreeMap · © OpenMapTiles';

/** L7: official harm-reduction information, not our own advice. */
export const HARM_REDUCTION_LINKS = [
  { label: 'Jellinek (addiction care, Amsterdam)', href: 'https://www.jellinek.nl' },
  { label: 'Trimbos Institute (national drugs monitor)', href: 'https://www.trimbos.nl' },
  { label: 'Drugs Info Team', href: 'https://www.drugsinfoteam.nl' },
];
