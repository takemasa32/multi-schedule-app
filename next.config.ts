import type { NextConfig } from 'next';
import withPWA from 'next-pwa';
// next-pwaの導入
const nextPwaConfig = {
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  fallbacks: {
    document: '/offline.html',
  },
};

const nextConfig: NextConfig = {
  // ...既存のNext.js設定をここに記述
};

export default withPWA(nextPwaConfig)(nextConfig);
