import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Directory } from '@/components/Directory';
import { getNeighbourhoods, getVenueIndex, GENERATED_AT } from '@/lib/venues';
import { getDictionary } from '@/i18n';
import { format, formatDate, isLocale, LOCALES } from '@/i18n/config';
import { alternatesFor } from '@/lib/site';

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
    title: `${dict.meta.siteName} — ${dict.meta.tagline}`,
    description: dict.meta.homeDescription,
    alternates: alternatesFor(locale, ''),
  };
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dict = getDictionary(locale);
  const venues = getVenueIndex();
  const neighbourhoods = getNeighbourhoods();
  const openCount = venues.filter((venue) => venue.status === 'open').length;

  return (
    <>
      <section className="mx-auto w-full max-w-7xl px-4 pb-4 pt-6">
        <h1 className="text-balance text-[1.6rem] font-semibold leading-tight tracking-tight sm:text-3xl">
          {format(dict.home.heading, { count: openCount })}
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[var(--color-muted)]">
          {dict.home.intro}{' '}
          <span className="whitespace-nowrap">
            {format(dict.home.updated, { date: formatDate(GENERATED_AT, locale) })}.
          </span>{' '}
          {dict.home.noProducts}
        </p>
      </section>

      <Directory
        venues={venues}
        neighbourhoods={neighbourhoods}
        renderedAt={Date.now()}
        locale={locale}
        dict={dict}
      />
    </>
  );
}
