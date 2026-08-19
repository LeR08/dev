import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ATTRIBUTION, GENERATED_AT, getAllVenues } from '@/lib/venues';
import { getDictionary } from '@/i18n';
import { isLocale, LOCALES, LOCALE_TAGS } from '@/i18n/config';
import { alternatesFor, TILE_ATTRIBUTION } from '@/lib/site';

export const revalidate = 3600;

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  return {
    title: dict.aboutData.title,
    description: dict.aboutData.intro,
    alternates: alternatesFor(locale, 'about-data'),
  };
}

export default async function AboutDataPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  const venues = getAllVenues();
  const stats = [
    { label: dict.aboutData.statVenues, value: venues.length },
    { label: dict.aboutData.statOpen, value: venues.filter((v) => v.status === 'open').length },
    { label: dict.aboutData.statOsm, value: venues.filter((v) => v.hours_source === 'osm').length },
    { label: dict.aboutData.statLicence, value: venues.filter((v) => v.hours_source === 'licence').length },
    { label: dict.aboutData.statUnknown, value: venues.filter((v) => v.hours_source === null).length },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-balance text-3xl font-semibold tracking-tight">{dict.aboutData.title}</h1>
      <p className="mt-3 leading-relaxed text-[var(--color-muted)]">{dict.aboutData.intro}</p>

      {/* L4: the attribution both licences require, in full. */}
      <section className="panel mt-8 p-5">
        <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]">
          {dict.aboutData.attribution}
        </h2>
        <ul className="mt-3 space-y-1.5 text-sm">
          {ATTRIBUTION.map((line) => (
            <li key={line}>{line}</li>
          ))}
          <li>{TILE_ATTRIBUTION}</li>
        </ul>
      </section>

      <Prose title={dict.aboutData.licenceTitle}>
        <p>{dict.aboutData.licenceBody}</p>
        <p>{dict.aboutData.licenceHours}</p>
      </Prose>

      <Prose title={dict.aboutData.osmTitle}>
        <p>{dict.aboutData.osmBody}</p>
      </Prose>

      <Prose title={dict.aboutData.reviewsTitle}>
        <p>{dict.aboutData.reviewsBody}</p>
      </Prose>

      <Prose title={dict.aboutData.directoryTitle}>
        <p>{dict.aboutData.directoryBody}</p>
      </Prose>

      <Prose title={dict.aboutData.cadenceTitle}>
        <p>{dict.aboutData.cadenceBody}</p>
      </Prose>

      <dl className="mt-5 grid gap-2 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="panel p-4">
            <dt className="text-xs text-[var(--color-muted)]">{stat.label}</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">{stat.value}</dd>
          </div>
        ))}
        <div className="panel p-4 sm:col-span-3">
          <dt className="text-xs text-[var(--color-muted)]">{dict.aboutData.statGenerated}</dt>
          <dd className="mt-1 tabular-nums">
            <time dateTime={GENERATED_AT}>
              {new Date(GENERATED_AT).toLocaleString(LOCALE_TAGS[locale], {
                timeZone: 'Europe/Amsterdam',
              })}
            </time>
          </dd>
        </div>
      </dl>

      <Prose title={dict.aboutData.notTitle}>
        <ul className="list-disc space-y-1 pl-5">
          <li>{dict.aboutData.not1}</li>
          <li>{dict.aboutData.not2}</li>
          <li>{dict.aboutData.not3}</li>
          <li>{dict.aboutData.not4}</li>
        </ul>
        <p className="text-sm">
          {dict.aboutData.verify}{' '}
          <Link href={`/${locale}/privacy`} className="underline underline-offset-4">
            {dict.aboutData.seeAlso}
          </Link>
          .
        </p>
      </Prose>
    </div>
  );
}

function Prose({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <div className="mt-2 space-y-3 leading-relaxed text-[var(--color-muted)]">{children}</div>
    </section>
  );
}
