import { Toaster } from "react-hot-toast";
import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import siteConfig from "@/lib/site-config";
import { ThemeProvider } from "@/components/theme-provider";
import ExternalBrowserBanner from "@/components/browser-banner";
import GoogleAnalytics from "@/components/analytics/google-analytics";
import AddToHomeScreenBanner from "@/components/add-to-home-screen";
import LineExternalBrowserRedirector from "@/components/browser-banner/LineExternalBrowserRedirector";

export const metadata: Metadata = {
  title: siteConfig.meta.title,
  description: siteConfig.meta.description,
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: siteConfig.logo.icon, type: "image/svg+xml" },
    ],
    apple: [{ url: "/logo/apple-icon.png", sizes: "180x180" }],
    other: [
      {
        rel: "mask-icon",
        url: "/logo/favicon.svg",
        color: siteConfig.meta.themeColor,
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
    <html lang="ja" suppressHydrationWarning>
      <body className="flex flex-col min-h-screen bg-base-100">
        <ThemeProvider
          attribute="data-theme"
          defaultTheme="daysynth"
          enableSystem={false}
        >
          <GoogleAnalytics />
          <LineExternalBrowserRedirector />
          <ExternalBrowserBanner />
          <AddToHomeScreenBanner />
          <Header />
          <main className="flex-grow container mx-auto px-4 py-6">
            {children}
          </main>
          <Footer />
          <Toaster position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
