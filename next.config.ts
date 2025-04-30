import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    authInterrupts: true
  },
  reactStrictMode: true,
  transpilePackages: ['@xata.io/components', '@xata.io/theme', '@xata.io/code-highlighter'],
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
  }
};

export default nextConfig;
