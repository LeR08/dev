import type { MetadataRoute } from 'next';
import { getAllVenues, getNeighbourhoods, GENERATED_AT } from '@/lib/venues';
import { SITE_URL } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date(GENERATED_AT);

  return [
    { url: SITE_URL, lastModified, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/neighbourhood`, lastModified, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${SITE_URL}/about-data`, lastModified, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/privacy`, lastModified, changeFrequency: 'yearly', priority: 0.2 },
    ...getNeighbourhoods().map((entry) => ({
      url: `${SITE_URL}/neighbourhood/${entry.slug}`,
      lastModified,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
    ...getAllVenues().map((venue) => ({
      url: `${SITE_URL}/coffeeshop/${venue.slug}`,
      lastModified,
      changeFrequency: 'weekly' as const,
      // Closed venues stay indexed — "is X still open?" is a real search.
      priority: venue.status === 'open' ? 0.8 : 0.3,
    })),
  ];
}
