import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@internal/components'],
  async redirects() {
    return [];
  },
  async rewrites() {
    return [];
  }
};

export default nextConfig;
