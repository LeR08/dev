import type { MetadataRoute } from 'next';
import { getAllVenues, getNeighbourhoods, GENERATED_AT } from '@/lib/venues';
import { SITE_URL } from '@/lib/site';
import { LOCALES, LOCALE_TAGS } from '@/i18n/config';

/** Each URL lists its translations, so search engines pair the four locales. */
function languagesFor(path: string) {
  return Object.fromEntries(
    LOCALES.map((locale) => [LOCALE_TAGS[locale], `${SITE_URL}/${locale}${path}`]),
  );
}

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date(GENERATED_AT);

  const paths: { path: string; changeFrequency: 'daily' | 'weekly' | 'monthly' | 'yearly'; priority: number }[] = [
    { path: '', changeFrequency: 'daily', priority: 1 },
    { path: '/neighbourhood', changeFrequency: 'weekly', priority: 0.6 },
    { path: '/about-data', changeFrequency: 'monthly', priority: 0.4 },
    { path: '/privacy', changeFrequency: 'yearly', priority: 0.2 },
    ...getNeighbourhoods().map((entry) => ({
      path: `/neighbourhood/${entry.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
    ...getAllVenues().map((venue) => ({
      path: `/coffeeshop/${venue.slug}`,
      changeFrequency: 'weekly' as const,
      // Closed venues stay indexed — "is X still open?" is a real search.
      priority: venue.status === 'open' ? 0.8 : 0.3,
    })),
  ];

  return paths.flatMap((entry) =>
    LOCALES.map((locale) => ({
      url: `${SITE_URL}/${locale}${entry.path}`,
      lastModified,
      changeFrequency: entry.changeFrequency,
      priority: entry.priority,
      alternates: { languages: languagesFor(entry.path) },
    })),
  );
}
