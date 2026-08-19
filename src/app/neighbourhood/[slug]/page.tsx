import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getNeighbourhood, getNeighbourhoods, getVenuesInNeighbourhood } from '@/lib/venues';
import { OpenBadge } from '@/components/OpenBadge';

export const revalidate = 3600;
export const dynamicParams = false;

export function generateStaticParams() {
  return getNeighbourhoods().map((entry) => ({ slug: entry.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const neighbourhood = getNeighbourhood(slug);
  if (!neighbourhood) return {};
  return {
    title: `Coffeeshops in ${neighbourhood.name}`,
    description: `${neighbourhood.count} licensed coffeeshops in ${neighbourhood.name}, Amsterdam, with addresses and opening hours.`,
    alternates: { canonical: `/neighbourhood/${slug}` },
  };
}

export default async function NeighbourhoodPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const neighbourhood = getNeighbourhood(slug);
  if (!neighbourhood) notFound();

  const venues = getVenuesInNeighbourhood(slug).sort((a, b) => a.name.localeCompare(b.name, 'nl'));

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <nav aria-label="Breadcrumb" className="text-sm text-[var(--color-muted)]">
        <Link href="/neighbourhood" className="underline">
          Neighbourhoods
        </Link>
      </nav>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">
        Coffeeshops in {neighbourhood.name}
      </h1>
      <p className="mt-1 text-sm text-[var(--color-muted)]">
        {venues.length} {venues.length === 1 ? 'venue' : 'venues'} on record.
      </p>

      <ul className="mt-6 space-y-2">
        {venues.map((venue) => (
          <li key={venue.slug}>
            <Link
              href={`/coffeeshop/${venue.slug}`}
              className="block rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] p-3"
            >
              <span className="font-medium">{venue.name}</span>
              <span className="block text-sm text-[var(--color-muted)]">{venue.address}</span>
              <span className="mt-2 block">
                <OpenBadge venue={venue} />
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-8">
        <Link href={`/?neighbourhood=${encodeURIComponent(neighbourhood.name)}`} className="underline">
          See {neighbourhood.name} on the map
        </Link>
      </p>
    </div>
  );
}
