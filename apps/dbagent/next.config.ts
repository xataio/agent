import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@internal/components'],
  async redirects() {
    return [
      {
        source: '/',
        destination: '/start',
        permanent: false
      }
    ];
  },
  async rewrites() {
    return [];
  }
};
module.exports = nextConfig;
