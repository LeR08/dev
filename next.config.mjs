/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // maplibre-gl ships ESM that benefits from being bundled rather than externalised
    optimizePackageImports: ['maplibre-gl'],
  },
};

export default nextConfig;
