import type { Metadata } from 'next';
import Link from 'next/link';
import { ATTRIBUTION, GENERATED_AT, getAllVenues } from '@/lib/venues';
import { SITE_NAME, TILE_ATTRIBUTION } from '@/lib/site';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Where this data comes from',
  description:
    'Sources, licences and update cadence behind the Amsterdam coffeeshop directory.',
  alternates: { canonical: '/about-data' },
};

export default function AboutDataPage() {
  const venues = getAllVenues();
  const open = venues.filter((venue) => venue.status === 'open').length;
  const withOsmHours = venues.filter((venue) => venue.hours_source === 'osm').length;
  const withLicenceHours = venues.filter((venue) => venue.hours_source === 'licence').length;
  const withoutHours = venues.filter((venue) => venue.hours_source === null).length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Where this data comes from</h1>
      <p className="mt-3 text-[var(--color-muted)]">
        {SITE_NAME} combines two public datasets and adds nothing to them beyond structure. Every
        field on a venue page names the source it came from.
      </p>

      {/* L4: the attribution required by both licences, in full. */}
      <section className="mt-8 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
        <h2 className="font-medium">Attribution</h2>
        <ul className="mt-2 space-y-1 text-sm text-[var(--color-muted)]">
          {ATTRIBUTION.map((line) => (
            <li key={line}>{line}</li>
          ))}
          <li>{TILE_ATTRIBUTION}</li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-medium">1. Amsterdam operating-licence register</h2>
        <p className="mt-2 text-[var(--color-muted)]">
          The city publishes every granted <i lang="nl">exploitatievergunning</i> as an open WFS
          service under CC BY 4.0. We select the records whose category or specification is
          &ldquo;Coffeeshop&rdquo;, whose permit status is <i lang="nl">Verleend</i>, and whose end
          date has not passed. That register decides which venues exist here, what they are called
          officially, and where they are.
        </p>
        <p className="mt-2 text-[var(--color-muted)]">
          The licence also carries opening times. Those are the hours the permit
          <em> allows</em> — commonly 07:00 to 01:00 — not the hours a venue actually trades. We
          show them only when nothing better is available, and always with that caveat attached.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-medium">2. OpenStreetMap</h2>
        <p className="mt-2 text-[var(--color-muted)]">
          Websites, phone numbers, accessibility, terraces and real opening hours come from
          OpenStreetMap, queried once per night through Overpass. An OSM record is only attached to
          a licensed venue when it is within 40 m with a similar name, shares the exact street and
          house number, or carries a near-identical name within 150 m. Anything else waits in a
          review queue rather than being published.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-medium">3. Reviews and ratings</h2>
        <p className="mt-2 text-[var(--color-muted)]">
          Reviews will be written here by visitors and stored by us. We do not copy ratings or
          reviews from Google, TripAdvisor or anywhere else.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-medium">Update cadence and current state</h2>
        <p className="mt-2 text-[var(--color-muted)]">
          The pipeline runs nightly at 03:00 Europe/Amsterdam. A run that returns implausible data
          is abandoned and the previous snapshot is kept, so a broken upstream response can never
          empty this directory. A venue that disappears from the licence register for two
          consecutive runs is marked closed — never deleted, because &ldquo;is this place still
          open?&rdquo; is a question worth answering.
        </p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <Stat label="Venues listed" value={String(venues.length)} />
          <Stat label="Currently licensed" value={String(open)} />
          <Stat label="Hours from OpenStreetMap" value={String(withOsmHours)} />
          <Stat label="Hours from the licence only" value={String(withLicenceHours)} />
          <Stat label="Hours unknown" value={String(withoutHours)} />
          <Stat
            label="Snapshot generated"
            value={new Date(GENERATED_AT).toLocaleString('en-GB', { timeZone: 'Europe/Amsterdam' })}
          />
        </dl>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-medium">What this site does not do</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-[var(--color-muted)]">
          <li>No product menus, strains, prices, potency or stock.</li>
          <li>No ordering, booking or delivery.</li>
          <li>No sponsored placement and no advertising.</li>
          <li>No content aimed at anyone under 18.</li>
        </ul>
        <p className="mt-3 text-sm text-[var(--color-muted)]">
          Licences and opening hours change faster than any nightly job. Verify locally before
          travelling to a venue. See also our <Link href="/privacy" className="underline">privacy notice</Link>.
        </p>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] p-3">
      <dt className="text-sm text-[var(--color-muted)]">{label}</dt>
      <dd className="mt-1 text-lg tabular-nums">{value}</dd>
    </div>
  );
}
