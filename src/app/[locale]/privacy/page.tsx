import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getDictionary } from '@/i18n';
import { isLocale, LOCALES } from '@/i18n/config';
import { alternatesFor } from '@/lib/site';

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
    title: dict.privacy.title,
    description: dict.privacy.locationBody,
    alternates: alternatesFor(locale, 'privacy'),
  };
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  const sections = [
    { title: dict.privacy.locationTitle, body: dict.privacy.locationBody },
    { title: dict.privacy.storedTitle, body: dict.privacy.storedBody },
    { title: dict.privacy.analyticsTitle, body: dict.privacy.analyticsBody },
    { title: dict.privacy.reviewsTitle, body: dict.privacy.reviewsBody },
    { title: dict.privacy.contactTitle, body: dict.privacy.contactBody },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-3xl font-semibold tracking-tight">{dict.privacy.title}</h1>
      {sections.map((section) => (
        <section key={section.title} className="mt-7">
          <h2 className="text-lg font-semibold tracking-tight">{section.title}</h2>
          <p className="mt-2 leading-relaxed text-[var(--color-muted)]">{section.body}</p>
        </section>
      ))}
    </div>
  );
}
