import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getNeighbourhoods } from '@/lib/venues';
import { getDictionary } from '@/i18n';
import { isLocale, LOCALES } from '@/i18n/config';
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
    title: dict.neighbourhoods.title,
    description: dict.neighbourhoods.intro,
    alternates: alternatesFor(locale, 'neighbourhood'),
  };
}

export default async function NeighbourhoodIndex({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const neighbourhoods = getNeighbourhoods();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-3xl font-semibold tracking-tight">{dict.neighbourhoods.title}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--color-muted)]">
        {dict.neighbourhoods.intro}
      </p>
      <ul className="mt-7 grid gap-2 sm:grid-cols-2">
        {neighbourhoods.map((entry) => (
          <li key={entry.slug}>
            <Link
              href={`/${locale}/neighbourhood/${entry.slug}`}
              className="card flex items-center justify-between gap-3 p-3.5"
            >
              <span className="min-w-0 truncate font-medium">{entry.name}</span>
              <span className="shrink-0 rounded-full bg-[var(--color-surface-2)] px-2 py-0.5 text-xs tabular-nums text-[var(--color-muted)]">
                {entry.count}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
