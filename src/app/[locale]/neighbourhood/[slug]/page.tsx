import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getNeighbourhood, getNeighbourhoods, getVenuesInNeighbourhood } from '@/lib/venues';
import { OpenBadge } from '@/components/OpenBadge';
import { getDictionary } from '@/i18n';
import { format, isLocale, LOCALES, plural } from '@/i18n/config';
import { alternatesFor } from '@/lib/site';

export const revalidate = 3600;
export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.flatMap((locale) =>
    getNeighbourhoods().map((entry) => ({ locale, slug: entry.slug })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const neighbourhood = getNeighbourhood(slug);
  if (!neighbourhood || !isLocale(locale)) return {};
  const dict = getDictionary(locale);

  return {
    title: format(dict.neighbourhoods.heading, { name: neighbourhood.name }),
    description: format(dict.meta.neighbourhoodDescription, {
      count: neighbourhood.count,
      name: neighbourhood.name,
    }),
    alternates: alternatesFor(locale, `neighbourhood/${slug}`),
  };
}

export default async function NeighbourhoodPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const neighbourhood = getNeighbourhood(slug);
  if (!neighbourhood) notFound();

  const dict = getDictionary(locale);
  const venues = getVenuesInNeighbourhood(slug).sort((a, b) => a.name.localeCompare(b.name, locale));

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <nav aria-label="Breadcrumb" className="text-sm text-[var(--color-muted)]">
        <Link
          href={`/${locale}/neighbourhood`}
          className="underline underline-offset-4 hover:text-[var(--color-text)]"
        >
          {dict.neighbourhoods.title}
        </Link>
      </nav>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">
        {format(dict.neighbourhoods.heading, { name: neighbourhood.name })}
      </h1>
      <p className="mt-1.5 text-sm text-[var(--color-muted)]">
        {plural(dict.neighbourhoods.count, venues.length, locale)}
      </p>

      <ul className="mt-7 space-y-2">
        {venues.map((venue) => (
          <li key={venue.slug}>
            <Link href={`/${locale}/coffeeshop/${venue.slug}`} className="card p-3.5">
              <span className="block font-semibold">{venue.name}</span>
              <span className="mt-0.5 block text-sm text-[var(--color-muted)]">{venue.address}</span>
              <span className="mt-2.5 block">
                <OpenBadge venue={venue} dict={dict.badge} />
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-8">
        <Link
          href={`/${locale}?neighbourhood=${encodeURIComponent(neighbourhood.name)}`}
          className="btn-quiet px-4 py-2.5 text-sm"
        >
          {format(dict.neighbourhoods.seeOnMap, { name: neighbourhood.name })}
        </Link>
      </p>
    </div>
  );
}
