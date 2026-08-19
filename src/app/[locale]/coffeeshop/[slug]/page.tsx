import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAllVenues, getNearbyVenues, getVenue } from '@/lib/venues';
import { weeklyTable } from '@/lib/hours/core';
import { OpenBadge } from '@/components/OpenBadge';
import { HoursProvenance } from '@/components/HoursProvenance';
import { CopyAddress } from '@/components/CopyAddress';
import { ReportLink } from '@/components/ReportLink';
import { formatDistance } from '@/lib/geo';
import { venueJsonLd } from '@/lib/jsonld';
import { slugify } from '@/lib/text';
import { getDictionary } from '@/i18n';
import { dayNames, format, formatDate, isLocale, LOCALES } from '@/i18n/config';
import { alternatesFor } from '@/lib/site';

export const revalidate = 3600;
export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.flatMap((locale) => getAllVenues().map((venue) => ({ locale, slug: venue.slug })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const venue = getVenue(slug);
  if (!venue || !isLocale(locale)) return {};
  const dict = getDictionary(locale);
  const where = venue.neighbourhood ? `${venue.address}, ${venue.neighbourhood}` : venue.address;

  return {
    title: venue.name,
    description: format(dict.meta.venueDescription, { name: venue.name, where }),
    alternates: alternatesFor(locale, `coffeeshop/${venue.slug}`),
  };
}

export default async function VenuePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const venue = getVenue(slug);
  if (!venue) notFound();

  const dict = getDictionary(locale);
  const days = dayNames(locale);
  const table = weeklyTable(venue);
  const nearby = getNearbyVenues(venue);
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${venue.lat},${venue.lng}`;
  const appleDirections = `https://maps.apple.com/?daddr=${venue.lat},${venue.lng}&dirflg=w`;

  const amenityLabels: Record<string, string> = {
    terrace: dict.venue.terrace,
    wheelchair: dict.venue.wheelchair,
    wifi: dict.venue.wifi,
  };

  return (
    <article className="mx-auto max-w-3xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(venueJsonLd(venue)) }}
      />

      <nav aria-label="Breadcrumb" className="text-sm text-[var(--color-muted)]">
        <Link href={`/${locale}`} className="underline underline-offset-4 hover:text-[var(--color-text)]">
          {dict.venue.breadcrumb}
        </Link>
        {venue.neighbourhood && (
          <>
            <span className="px-1.5">·</span>
            <Link
              href={`/${locale}/neighbourhood/${slugify(venue.neighbourhood)}`}
              className="underline underline-offset-4 hover:text-[var(--color-text)]"
            >
              {venue.neighbourhood}
            </Link>
          </>
        )}
      </nav>

      <header className="mt-4">
        <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">{venue.name}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <OpenBadge venue={venue} dict={dict.badge} />
          {venue.rating_count > 0 && (
            <span className="text-sm text-[var(--color-muted)]">
              {venue.rating_avg?.toFixed(1)} ★ ({venue.rating_count})
            </span>
          )}
        </div>
      </header>

      {venue.status === 'open' && venue.licence_renewal_pending && venue.licence_valid_to && (
        <p
          role="status"
          className="mt-5 rounded-xl border border-[color-mix(in_srgb,var(--color-soon)_38%,transparent)] bg-[color-mix(in_srgb,var(--color-soon)_10%,transparent)] p-3.5 text-sm"
        >
          {format(dict.venue.renewalPending, { date: formatDate(venue.licence_valid_to, locale) })}
        </p>
      )}

      {venue.status !== 'open' && (
        <p
          role="status"
          className="mt-5 rounded-xl border border-[color-mix(in_srgb,var(--color-soon)_38%,transparent)] bg-[color-mix(in_srgb,var(--color-soon)_10%,transparent)] p-3.5 text-sm"
        >
          {venue.status === 'closed' ? dict.venue.closedNotice : dict.venue.renamedNotice}
        </p>
      )}

      <Section title={dict.venue.where}>
        <p className="text-lg">{venue.address}</p>
        <p className="text-sm text-[var(--color-muted)]">
          {[venue.postcode, venue.neighbourhood, 'Amsterdam'].filter(Boolean).join(' · ')}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <CopyAddress
            address={`${venue.address}, ${venue.postcode ?? ''} Amsterdam`}
            label={dict.venue.copyAddress}
            copiedLabel={dict.venue.copied}
          />
          <a href={directions} rel="noopener noreferrer nofollow" className="btn-quiet px-3 py-2 text-sm">
            {dict.venue.directionsGoogle}
          </a>
          <a href={appleDirections} rel="noopener noreferrer nofollow" className="btn-quiet px-3 py-2 text-sm">
            {dict.venue.directionsApple}
          </a>
        </div>
      </Section>

      <Section title={dict.venue.openingHours}>
        {table ? (
          <table className="w-full text-sm">
            <caption className="sr-only">{format(dict.venue.weeklyCaption, { name: venue.name })}</caption>
            <tbody>
              {[1, 2, 3, 4, 5, 6, 0].map((day) => {
                const row = table.find((entry) => entry.day === day);
                const today = new Date().getDay() === day;
                return (
                  <tr key={day} className="border-b border-[var(--color-line)] last:border-0">
                    <th
                      scope="row"
                      className={`py-2 text-left font-normal ${today ? 'text-[var(--color-text)]' : 'text-[var(--color-muted)]'}`}
                    >
                      {days[day]}
                    </th>
                    <td className={`py-2 text-right tabular-nums ${today ? 'font-medium' : ''}`}>
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
          <p className="text-sm text-[var(--color-muted)]">{dict.hours.unknown}</p>
        )}
        <div className="mt-4 border-t border-[var(--color-line)] pt-4">
          <HoursProvenance venue={venue} dict={dict.hours} locale={locale} />
        </div>
      </Section>

      {(Object.keys(venue.amenities).length > 0 ||
        venue.website ||
        venue.phone ||
        Object.keys(venue.socials).length > 0) && (
        <Section title={dict.venue.details}>
          <ul className="flex flex-wrap gap-2">
            {Object.entries(venue.amenities)
              .filter(([key, value]) => value === true && key in amenityLabels)
              .map(([key]) => (
                <li key={key} className="chip">
                  {amenityLabels[key]}
                </li>
              ))}
          </ul>
          <dl className="mt-4 space-y-1.5 text-sm">
            {venue.website && (
              <Row label={dict.venue.website}>
                <a
                  className="underline underline-offset-4"
                  href={venue.website}
                  rel="noopener noreferrer nofollow"
                >
                  {venue.website.replace(/^https?:\/\//, '')}
                </a>
                {venue.website_live === false && (
                  <span className="block text-xs text-[var(--color-muted)]">{dict.venue.websiteDown}</span>
                )}
              </Row>
            )}
            {venue.phone && (
              <Row label={dict.venue.phone}>
                <a className="underline underline-offset-4" href={`tel:${venue.phone.replace(/\s/g, '')}`}>
                  {venue.phone}
                </a>
              </Row>
            )}
            {venue.licence_number && (
              <Row label={dict.venue.licence}>
                <span className="tabular-nums">
                  {venue.licence_number}
                  {venue.licence_valid_to
                    ? ` · ${format(dict.venue.validTo, { date: formatDate(venue.licence_valid_to, locale) })}`
                    : ''}
                </span>
              </Row>
            )}
          </dl>

          {Object.keys(venue.socials).length > 0 && (
            <div className="mt-4 border-t border-[var(--color-line)] pt-4">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]">
                {dict.venue.socials}
              </p>
              <ul className="mt-2.5 flex flex-wrap gap-2">
                {Object.entries(venue.socials)
                  .filter(([network]) => network in SOCIAL_URLS)
                  .map(([network, handle]) => (
                    <li key={network}>
                      <a
                        className="chip hover:text-[var(--color-text)]"
                        href={SOCIAL_URLS[network](handle)}
                        rel="noopener noreferrer nofollow"
                      >
                        {SOCIAL_NAMES[network]}
                        <span className="text-[var(--color-muted)]">
                          {network === 'youtube' ? '' : `@${handle}`}
                        </span>
                      </a>
                    </li>
                  ))}
              </ul>
              {venue.socials_shared.length > 0 && (
                <p className="mt-2 text-xs text-[var(--color-muted)]">{dict.venue.chainAccount}</p>
              )}
            </div>
          )}
        </Section>
      )}

      <section className="mt-5 rounded-xl border border-dashed border-[var(--color-line-strong)] p-5">
        <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]">
          {dict.venue.reviews}
        </h2>
        <p className="mt-2.5 text-sm text-[var(--color-muted)]">{dict.venue.reviewsSoon}</p>
      </section>

      <section className="mt-8">
        <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]">
          {dict.venue.nearby}
        </h2>
        <ul className="mt-3 space-y-2">
          {nearby.map(({ venue: other, distance }) => (
            <li key={other.slug}>
              <Link
                href={`/${locale}/coffeeshop/${other.slug}`}
                className="card flex items-center justify-between gap-3 p-3.5"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{other.name}</span>
                  <span className="block truncate text-sm text-[var(--color-muted)]">{other.address}</span>
                </span>
                <span className="shrink-0 text-sm tabular-nums text-[var(--color-muted)]">
                  {formatDistance(distance)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <ReportLink venueSlug={venue.slug} venueName={venue.name} dict={dict.report} />
    </article>
  );
}

/** Handles are stored bare; the platform URL is rebuilt here. */
const SOCIAL_URLS: Record<string, (handle: string) => string> = {
  instagram: (h) => `https://instagram.com/${h}`,
  facebook: (h) => `https://facebook.com/${h}`,
  tiktok: (h) => `https://tiktok.com/@${h}`,
  x: (h) => `https://x.com/${h}`,
  youtube: (h) => (h.startsWith('UC') ? `https://youtube.com/channel/${h}` : `https://youtube.com/@${h}`),
};

const SOCIAL_NAMES: Record<string, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  x: 'X',
  youtube: 'YouTube',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="panel mt-5 p-5">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <dt className="w-24 shrink-0 text-[var(--color-muted)]">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}
