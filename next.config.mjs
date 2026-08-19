/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  /**
   * Every route lives under a locale segment (§F9). These redirects keep the
   * bare paths working and send them to the default locale; a visitor who wants
   * another language picks it from the header and the choice sticks to the URL.
   */
  async redirects() {
    return [
      { source: '/', destination: '/en', permanent: false },
      { source: '/coffeeshop/:slug', destination: '/en/coffeeshop/:slug', permanent: false },
      { source: '/neighbourhood', destination: '/en/neighbourhood', permanent: false },
      { source: '/neighbourhood/:slug', destination: '/en/neighbourhood/:slug', permanent: false },
      { source: '/about-data', destination: '/en/about-data', permanent: false },
      { source: '/privacy', destination: '/en/privacy', permanent: false },
    ];
  },

  experimental: {
    // maplibre-gl ships ESM that benefits from being bundled rather than externalised
    optimizePackageImports: ['maplibre-gl'],
  },
};

export default nextConfig;
