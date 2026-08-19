import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { AgeGate } from '@/components/AgeGate';
import { ThemeToggle } from '@/components/ThemeToggle';
import { HARM_REDUCTION_LINKS, SITE_NAME, SITE_TAGLINE, SITE_URL, TILE_ATTRIBUTION } from '@/lib/site';
import { ATTRIBUTION } from '@/lib/venues';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME} — Amsterdam coffeeshop directory`, template: `%s — ${SITE_NAME}` },
  description: SITE_TAGLINE,
  alternates: { canonical: '/' },
  openGraph: { title: SITE_NAME, description: SITE_TAGLINE, type: 'website', locale: 'en_GB' },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-dvh">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-[var(--color-accent)] focus:px-4 focus:py-2"
        >
          Skip to content
        </a>
        <header className="border-b border-[var(--color-line)] bg-[var(--color-surface)]">
          <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
            <Link href="/" className="text-base font-semibold tracking-tight">
              {SITE_NAME}
            </Link>
            <nav aria-label="Main" className="ml-auto flex items-center gap-4 text-sm text-[var(--color-muted)]">
              <Link href="/neighbourhood" className="hover:text-[var(--color-text)]">
                Neighbourhoods
              </Link>
              <Link href="/about-data" className="hover:text-[var(--color-text)]">
                Data
              </Link>
              <ThemeToggle />
            </nav>
          </div>
        </header>

        <main id="main">{children}</main>

        <footer className="mt-12 border-t border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-8 text-sm text-[var(--color-muted)]">
          <div className="mx-auto grid max-w-7xl gap-8 sm:grid-cols-3">
            <div>
              <h2 className="font-medium text-[var(--color-text)]">Data sources</h2>
              <ul className="mt-2 space-y-1">
                {ATTRIBUTION.map((line) => (
                  <li key={line}>{line}</li>
                ))}
                <li>{TILE_ATTRIBUTION}</li>
              </ul>
              <Link href="/about-data" className="mt-2 inline-block underline">
                How this data is collected
              </Link>
            </div>
            <div>
              <h2 className="font-medium text-[var(--color-text)]">Health and safety</h2>
              <ul className="mt-2 space-y-1">
                {HARM_REDUCTION_LINKS.map((link) => (
                  <li key={link.href}>
                    <a className="underline" href={link.href} rel="noopener noreferrer nofollow">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="font-medium text-[var(--color-text)]">About</h2>
              <ul className="mt-2 space-y-1">
                <li>
                  <Link href="/privacy" className="underline">
                    Privacy
                  </Link>
                </li>
                <li>Strictly 18+. Informational only.</li>
                <li>
                  Licences and opening hours change. Verify locally before travelling to a venue.
                </li>
              </ul>
            </div>
          </div>
        </footer>

        <AgeGate />
      </body>
    </html>
  );
}
