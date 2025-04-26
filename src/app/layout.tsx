import { Toaster } from "react-hot-toast";
import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "複数日程調整アプリ - みんなの予定を簡単調整",
  description:
    "イベント・会議・集まりの日程調整を簡単に。複数の候補日から参加者の都合を集計し、最適な日程を見つけます。ログイン不要、リンク共有だけで誰でも簡単に回答できます。",
  icons: {
    icon: [
      { url: "/logo/favicon.ico", sizes: "32x32" },
      { url: "/logo/favicon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/logo/apple-icon.png", sizes: "180x180" }],
    other: [
      {
        rel: "mask-icon",
        url: "/logo/favicon.svg",
        color: "#6366f1", // Primary color from your theme
      },
    ],
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" data-theme="light">
      <body className="flex flex-col min-h-screen bg-base-100">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-6">
          {children}
        </main>
        <Footer />
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
