import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from '@/components/theme-provider';
import { env } from '@/lib/env';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const siteName = 'AtelierDigital';
const description =
  'La formation complète pour créer un produit digital, acheter du trafic rentable et le vendre. Media buying, marketing digital, tunnels de vente et conversion.';

export const metadata: Metadata = {
  metadataBase: new URL(env.siteUrl()),
  title: {
    default: `${siteName} — Créer, promouvoir et vendre un produit digital`,
    template: `%s · ${siteName}`,
  },
  description,
  applicationName: siteName,
  keywords: [
    'formation media buying',
    'marketing digital',
    'produit digital',
    'tunnel de vente',
    'copywriting',
    'meta ads',
    'formation en ligne',
  ],
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    siteName,
    title: `${siteName} — Créer, promouvoir et vendre un produit digital`,
    description,
  },
  twitter: { card: 'summary_large_image', title: siteName, description },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fdfdff' },
    { media: '(prefers-color-scheme: dark)', color: '#111318' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={inter.variable}
      // Déclare explicitement le défilement fluide défini dans globals.css.
      // Sans cet attribut, Next.js avertit en console et désactive le
      // défilement fluide pendant les transitions de route.
      data-scroll-behavior="smooth"
    >
      <body className="min-h-dvh antialiased">
        <a
          href="#contenu"
          className="bg-primary text-primary-foreground sr-only rounded-md px-4 py-2 focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-100"
        >
          Aller au contenu
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
