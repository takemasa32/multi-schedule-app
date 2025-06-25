import type { NextConfig } from "next";
import withPWA from "next-pwa";
// next-pwaの導入
const nextPwaConfig = {
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  runtimeCaching: [
    {
      urlPattern: /^\/$/,
      handler: "CacheFirst",
      options: {
        cacheName: "landing-page",
        expiration: { maxAgeSeconds: 60 * 60 * 24 },
      },
    },
    {
      urlPattern: /^\/home/,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "home-page",
      },
    },
    {
      urlPattern: /^\/event\//,
      handler: "NetworkFirst",
      options: {
        cacheName: "event-pages",
        expiration: { maxAgeSeconds: 60 * 5 },
      },
    },
    {
      urlPattern: /^\/history/,
      handler: "CacheFirst",
      options: {
        cacheName: "history-page",
        expiration: { maxAgeSeconds: 60 * 60 * 24 },
      },
    },
    {
      urlPattern: /^\/terms/,
      handler: "CacheFirst",
      options: {
        cacheName: "terms-page",
        expiration: { maxAgeSeconds: 60 * 60 * 24 * 7 },
      },
    },
  ],
  fallbacks: {
    document: "/offline.html",
  },
};

const nextConfig: NextConfig = {
  // ...既存のNext.js設定をここに記述
};

export default withPWA(nextPwaConfig)(nextConfig);
