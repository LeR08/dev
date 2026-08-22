import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'i.ytimg.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'demo.invalid' },
    ],
  },
  // typedRoutes est volontairement désactivé : les chemins dynamiques
  // (`/courses/${slug}`) ne sont pas exprimables dans son typage, et
  // src/lib/constants/routes.ts joue déjà le rôle de source unique de vérité.
};

export default nextConfig;
