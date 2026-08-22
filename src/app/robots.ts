import type { MetadataRoute } from 'next';
import { env } from '@/lib/env';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Les espaces personnels et l'administration ne doivent jamais être indexés.
      disallow: [
        '/dashboard',
        '/my-courses',
        '/learn/',
        '/quiz/',
        '/progress',
        '/favorites',
        '/notes',
        '/goals',
        '/notifications',
        '/profile',
        '/settings',
        '/activate',
        '/onboarding',
        '/admin',
        '/api/',
      ],
    },
    sitemap: `${env.siteUrl()}/sitemap.xml`,
  };
}
