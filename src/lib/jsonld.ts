import { resolveHours, weeklyTable } from '@/lib/hours/core';
import { SITE_URL } from '@/lib/site';
import type { Venue } from '@/lib/types';

const OSM_DAY_URLS = [
  'https://schema.org/Sunday',
  'https://schema.org/Monday',
  'https://schema.org/Tuesday',
  'https://schema.org/Wednesday',
  'https://schema.org/Thursday',
  'https://schema.org/Friday',
  'https://schema.org/Saturday',
];

/**
 * LocalBusiness rather than a cannabis-specific type: the entity we describe is
 * a venue, and §2 keeps products out of the model entirely. `aggregateRating`
 * is emitted only once a real review exists, as the acceptance gate requires.
 */
export function venueJsonLd(venue: Venue) {
  const table = weeklyTable(venue);
  const resolved = resolveHours(venue);

  const specification = (table ?? []).flatMap((row) =>
    row.intervals.map((interval) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: OSM_DAY_URLS[row.day],
      opens: interval.from,
      closes: interval.to,
    })),
  );

  // Licensed hours are an outer bound, not trading hours: asserting them in
  // structured data would put a time in search results the venue never honours.
  const publishHours = resolved.source !== 'licence' && specification.length > 0;

  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${SITE_URL}/coffeeshop/${venue.slug}`,
    name: venue.name,
    legalName: venue.legal_name ?? undefined,
    url: `${SITE_URL}/coffeeshop/${venue.slug}`,
    sameAs: venue.website ? [venue.website] : undefined,
    telephone: venue.phone ?? undefined,
    address: {
      '@type': 'PostalAddress',
      streetAddress: venue.address,
      postalCode: venue.postcode ?? undefined,
      addressLocality: 'Amsterdam',
      addressCountry: 'NL',
    },
    geo: { '@type': 'GeoCoordinates', latitude: venue.lat, longitude: venue.lng },
    ...(publishHours ? { openingHoursSpecification: specification } : {}),
    ...(venue.rating_count >= 1 && venue.rating_avg != null
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: venue.rating_avg,
            reviewCount: venue.rating_count,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
    ...(venue.status !== 'open' ? { additionalProperty: { '@type': 'PropertyValue', name: 'status', value: venue.status } } : {}),
  };
}
