import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@internal/components'],
  async redirects() {
    return [
      {
        source: '/',
        destination: '/projects',
        permanent: false
      }
    ];
  },
  async rewrites() {
    return [];
  },
  output: 'standalone'
};

export default nextConfig;
