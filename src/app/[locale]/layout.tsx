import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import '../globals.css';
import { AgeGate } from '@/components/AgeGate';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguagePicker } from '@/components/LanguagePicker';
import { getDictionary } from '@/i18n';
import { isLocale, LOCALES, LOCALE_TAGS, type Locale } from '@/i18n/config';
import { HARM_REDUCTION_LINKS, SITE_URL, TILE_ATTRIBUTION } from '@/lib/site';
import { ATTRIBUTION } from '@/lib/venues';

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
    metadataBase: new URL(SITE_URL),
    title: {
      default: `${dict.meta.siteName} — ${dict.meta.tagline}`,
      template: `%s — ${dict.meta.siteName}`,
    },
    description: dict.meta.homeDescription,
    openGraph: {
      title: dict.meta.siteName,
      description: dict.meta.tagline,
      type: 'website',
      locale: LOCALE_TAGS[locale].replace('-', '_'),
    },
    robots: { index: true, follow: true },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/* Applies the stored theme before first paint, so a light-theme
            visitor never sees a flash of the dark default. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('smoke-trail:theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}",
          }}
        />
      </head>
      <body className="flex min-h-dvh flex-col">
        <a
          href="#main"
          className="btn-accent sr-only px-4 py-2 focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50"
        >
          {dict.nav.skip}
        </a>

        <Header locale={locale} dict={dict} />

        <main id="main" className="flex-1">
          {children}
        </main>

        <Footer locale={locale} dict={dict} />
        <AgeGate dict={dict.ageGate} />
      </body>
    </html>
  );
}

function Header({ locale, dict }: { locale: Locale; dict: ReturnType<typeof getDictionary> }) {
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--color-line)] bg-[var(--color-surface)]/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5">
        <Link href={`/${locale}`} className="flex items-center gap-2.5">
          <Mark />
          <span className="text-[15px] font-semibold tracking-tight">{dict.meta.siteName}</span>
        </Link>

        <nav
          aria-label="Main"
          className="ml-auto flex items-center gap-1 text-sm text-[var(--color-muted)]"
        >
          <Link
            href={`/${locale}/neighbourhood`}
            className="hidden rounded-lg px-2.5 py-1.5 hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)] sm:block"
          >
            {dict.nav.neighbourhoods}
          </Link>
          <Link
            href={`/${locale}/about-data`}
            className="hidden rounded-lg px-2.5 py-1.5 hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)] sm:block"
          >
            {dict.nav.data}
          </Link>
          <LanguagePicker locale={locale} label={dict.nav.language} />
          <ThemeToggle toLight={dict.nav.toLight} toDark={dict.nav.toDark} />
        </nav>
      </div>
    </header>
  );
}

/** A trail of three points — a route through the city, not a leaf (§12). */
function Mark() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden focusable="false">
      <path
        d="M4 17c4.5 0 3-5.5 7.5-5.5S18 6 18 5"
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeDasharray="0.1 3.6"
      />
      <circle cx="4" cy="17" r="2.4" fill="var(--color-accent)" />
      <circle cx="18" cy="5" r="2.4" fill="none" stroke="var(--color-accent)" strokeWidth="1.75" />
    </svg>
  );
}

function Footer({ locale, dict }: { locale: Locale; dict: ReturnType<typeof getDictionary> }) {
  return (
    <footer className="mt-16 border-t border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-10 text-sm text-[var(--color-muted)]">
      <div className="mx-auto grid max-w-7xl gap-8 sm:grid-cols-3">
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-text)]">
            {dict.footer.sources}
          </h2>
          {/* L4: the licence and tile notices, verbatim, on every page. */}
          <ul className="mt-3 space-y-1.5">
            {ATTRIBUTION.map((line) => (
              <li key={line}>{line}</li>
            ))}
            <li>{TILE_ATTRIBUTION}</li>
          </ul>
          <Link
            href={`/${locale}/about-data`}
            className="mt-3 inline-block text-[var(--color-text)] underline underline-offset-4"
          >
            {dict.footer.howCollected}
          </Link>
        </section>

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-text)]">
            {dict.footer.health}
          </h2>
          <ul className="mt-3 space-y-1.5">
            {HARM_REDUCTION_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  className="underline underline-offset-4 hover:text-[var(--color-text)]"
                  href={link.href}
                  rel="noopener noreferrer nofollow"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-text)]">
            {dict.footer.about}
          </h2>
          <ul className="mt-3 space-y-1.5">
            <li>
              <Link href={`/${locale}/privacy`} className="underline underline-offset-4">
                {dict.footer.privacy}
              </Link>
            </li>
            <li>{dict.footer.adults}</li>
            <li>{dict.footer.verify}</li>
          </ul>
        </section>
      </div>
    </footer>
  );
}
