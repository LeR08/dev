import type { Metadata } from 'next';
import { Directory } from '@/components/Directory';
import { getNeighbourhoods, getVenueIndex, GENERATED_AT } from '@/lib/venues';
import { SITE_NAME, SITE_TAGLINE } from '@/lib/site';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `${SITE_NAME} — Amsterdam coffeeshop directory`,
  description: SITE_TAGLINE,
};

export default function HomePage() {
  const venues = getVenueIndex();
  const neighbourhoods = getNeighbourhoods();
  const openCount = venues.filter((venue) => venue.status === 'open').length;

  return (
    <>
      <section className="border-b border-[var(--color-line)] bg-[var(--color-surface)]">
        <div className="mx-auto max-w-7xl px-4 py-5">
          <h1 className="text-2xl font-semibold tracking-tight">
            {openCount} licensed coffeeshops in Amsterdam
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--color-muted)]">
            Addresses, opening hours and the licence behind each one. Built from the city&rsquo;s own
            operating-licence register, updated{' '}
            <time dateTime={GENERATED_AT}>
              {new Date(GENERATED_AT).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                timeZone: 'Europe/Amsterdam',
              })}
            </time>
            . No products, no prices — this is a directory of venues.
          </p>
        </div>
      </section>

      <Directory venues={venues} neighbourhoods={neighbourhoods} renderedAt={Date.now()} />
    </>
  );
}
