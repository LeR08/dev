import type { Metadata } from 'next';
import Link from 'next/link';
import { getNeighbourhoods } from '@/lib/venues';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Neighbourhoods',
  description: 'Licensed Amsterdam coffeeshops grouped by neighbourhood.',
  alternates: { canonical: '/neighbourhood' },
};

export default function NeighbourhoodIndex() {
  const neighbourhoods = getNeighbourhoods();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Neighbourhoods</h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        Neighbourhood boundaries come from the city&rsquo;s own <i lang="nl">wijken</i> layer, so a
        venue sits in the same district the municipality places it in.
      </p>
      <ul className="mt-6 grid gap-2 sm:grid-cols-2">
        {neighbourhoods.map((entry) => (
          <li key={entry.slug}>
            <Link
              href={`/neighbourhood/${entry.slug}`}
              className="flex items-center justify-between rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] p-3"
            >
              <span>{entry.name}</span>
              <span className="text-sm text-[var(--color-muted)]">{entry.count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
