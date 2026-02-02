import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
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
