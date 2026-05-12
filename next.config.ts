import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/history',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
