import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAllVenues, getNearbyVenues, getVenue } from '@/lib/venues';
import { DAY_NAMES, weeklyTable } from '@/lib/hours/core';
import { OpenBadge } from '@/components/OpenBadge';
import { HoursProvenance } from '@/components/HoursProvenance';
import { CopyAddress } from '@/components/CopyAddress';
import { ReportLink } from '@/components/ReportLink';
import { formatDistance } from '@/lib/geo';
import { venueJsonLd } from '@/lib/jsonld';
import { slugify } from '@/lib/text';
import { SITE_NAME } from '@/lib/site';

export const revalidate = 3600;
export const dynamicParams = false;

export function generateStaticParams() {
  return getAllVenues().map((venue) => ({ slug: venue.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const venue = getVenue(slug);
  if (!venue) return {};
  const where = venue.neighbourhood ? `${venue.address}, ${venue.neighbourhood}` : venue.address;
  return {
    title: venue.name,
    description: `${venue.name} — licensed coffeeshop at ${where}, Amsterdam. Opening hours, location and visitor reviews.`,
    alternates: { canonical: `/coffeeshop/${venue.slug}` },
  };
}

const AMENITY_LABELS: Record<string, string> = {
  terrace: 'Terrace',
  wheelchair: 'Wheelchair accessible',
  wifi: 'Wi-Fi',
};

export default async function VenuePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const venue = getVenue(slug);
  if (!venue) notFound();

  const table = weeklyTable(venue);
  const nearby = getNearbyVenues(venue);
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${venue.lat},${venue.lng}`;
  const appleDirections = `https://maps.apple.com/?daddr=${venue.lat},${venue.lng}&dirflg=w`;

  return (
    <article className="mx-auto max-w-3xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(venueJsonLd(venue)) }}
      />

      <nav aria-label="Breadcrumb" className="text-sm text-[var(--color-muted)]">
        <Link href="/" className="underline">
          All venues
        </Link>
        {venue.neighbourhood && (
          <>
            {' · '}
            <Link href={`/neighbourhood/${slugify(venue.neighbourhood)}`} className="underline">
              {venue.neighbourhood}
            </Link>
          </>
        )}
      </nav>

      <header className="mt-3">
        <h1 className="text-3xl font-semibold tracking-tight">{venue.name}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <OpenBadge venue={venue} />
          {venue.rating_count > 0 && (
            <span className="text-sm text-[var(--color-muted)]">
              {venue.rating_avg?.toFixed(1)} ★ ({venue.rating_count})
            </span>
          )}
        </div>
      </header>

      {venue.status !== 'open' && (
        <p
          role="status"
          className="mt-4 rounded-md border border-[var(--color-soon)]/40 bg-[var(--color-soon)]/10 p-3 text-sm"
        >
          {venue.status === 'closed'
            ? 'This venue no longer appears in the city’s register of granted operating licences. It is kept here so the address stays searchable.'
            : 'This venue has been renamed.'}
        </p>
      )}

      <section className="mt-6 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-[var(--color-muted)]">
          Where
        </h2>
        <p className="mt-2 text-lg">{venue.address}</p>
        <p className="text-sm text-[var(--color-muted)]">
          {[venue.postcode, venue.neighbourhood, 'Amsterdam'].filter(Boolean).join(' · ')}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <CopyAddress address={`${venue.address}, ${venue.postcode ?? ''} Amsterdam`} />
          <a
            href={directions}
            rel="noopener noreferrer nofollow"
            className="rounded-md border border-[var(--color-line)] px-3 py-2 text-sm"
          >
            Directions (Google)
          </a>
          <a
            href={appleDirections}
            rel="noopener noreferrer nofollow"
            className="rounded-md border border-[var(--color-line)] px-3 py-2 text-sm"
          >
            Directions (Apple)
          </a>
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-[var(--color-muted)]">
          Opening hours
        </h2>
        {table ? (
          <table className="mt-3 w-full text-sm">
            <caption className="sr-only">Weekly opening hours for {venue.name}</caption>
            <tbody>
              {[1, 2, 3, 4, 5, 6, 0].map((day) => {
                const row = table.find((entry) => entry.day === day);
                return (
                  <tr key={day} className="border-b border-[var(--color-line)] last:border-0">
                    <th scope="row" className="py-1.5 text-left font-normal text-[var(--color-muted)]">
                      {DAY_NAMES[day]}
                    </th>
                    <td className="py-1.5 text-right tabular-nums">
                      {row && row.intervals.length > 0
                        ? row.intervals.map((interval) => `${interval.from}–${interval.to}`).join(', ')
                        : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="mt-3 text-sm text-[var(--color-muted)]">Hours unknown.</p>
        )}
        <div className="mt-3 border-t border-[var(--color-line)] pt-3">
          <HoursProvenance venue={venue} />
        </div>
      </section>

      {(Object.keys(venue.amenities).length > 0 || venue.website || venue.phone) && (
        <section className="mt-6 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
          <h2 className="text-sm font-medium uppercase tracking-wide text-[var(--color-muted)]">
            Details
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {Object.entries(venue.amenities)
              .filter(([, value]) => value === true)
              .map(([key]) => (
                <li
                  key={key}
                  className="rounded-full border border-[var(--color-line)] px-3 py-1 text-sm text-[var(--color-muted)]"
                >
                  {AMENITY_LABELS[key] ?? key}
                </li>
              ))}
          </ul>
          <dl className="mt-3 space-y-1 text-sm">
            {venue.website && (
              <div className="flex gap-2">
                <dt className="text-[var(--color-muted)]">Website</dt>
                <dd>
                  <a className="underline" href={venue.website} rel="noopener noreferrer nofollow">
                    {venue.website.replace(/^https?:\/\//, '')}
                  </a>
                </dd>
              </div>
            )}
            {venue.phone && (
              <div className="flex gap-2">
                <dt className="text-[var(--color-muted)]">Phone</dt>
                <dd>
                  <a className="underline" href={`tel:${venue.phone.replace(/\s/g, '')}`}>
                    {venue.phone}
                  </a>
                </dd>
              </div>
            )}
            {venue.licence_number && (
              <div className="flex gap-2">
                <dt className="text-[var(--color-muted)]">Licence</dt>
                <dd className="tabular-nums">
                  {venue.licence_number}
                  {venue.licence_valid_to ? ` · valid to ${venue.licence_valid_to}` : ''}
                </dd>
              </div>
            )}
          </dl>
        </section>
      )}

      <section className="mt-6 rounded-lg border border-dashed border-[var(--color-line)] p-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-[var(--color-muted)]">
          Reviews
        </h2>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Visitor reviews are not open yet. {SITE_NAME} hosts its own reviews rather than copying
          them from other sites.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-medium uppercase tracking-wide text-[var(--color-muted)]">
          Closest venues
        </h2>
        <ul className="mt-3 space-y-2">
          {nearby.map(({ venue: other, distance }) => (
            <li key={other.slug}>
              <Link
                href={`/coffeeshop/${other.slug}`}
                className="flex items-center justify-between rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] p-3"
              >
                <span>
                  <span className="font-medium">{other.name}</span>
                  <span className="block text-sm text-[var(--color-muted)]">{other.address}</span>
                </span>
                <span className="text-sm text-[var(--color-muted)]">{formatDistance(distance)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <ReportLink venueSlug={venue.slug} venueName={venue.name} />
    </article>
  );
}
