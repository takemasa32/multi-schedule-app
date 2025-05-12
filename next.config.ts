import type { NextConfig } from "next";
// next-pwaの導入
const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  fallbacks: {
    document: "/offline.html",
  },
});

const nextConfig: NextConfig = {
  // ...既存のNext.js設定をここに記述
};

export default withPWA(nextConfig);
