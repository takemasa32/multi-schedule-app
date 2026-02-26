import { Toaster } from 'react-hot-toast';
import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import siteConfig from '@/lib/site-config';
import { ThemeProvider } from '@/components/theme-provider';
import ExternalBrowserBanner from '@/components/browser-banner';
import GoogleAnalytics from '@/components/analytics/google-analytics';
import AuthSessionProvider from '@/components/auth/session-provider';
// import AddToHomeScreenBanner from "@/components/add-to-home-screen";

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: siteConfig.meta.title,
  description: siteConfig.meta.description,
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: siteConfig.logo.icon, type: 'image/svg+xml' },
    ],
    apple: [{ url: '/logo/apple-icon.png', sizes: '180x180' }],
    other: [
      {
        rel: 'mask-icon',
        url: '/logo/favicon.svg',
        color: siteConfig.meta.themeColor,
      },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body className="bg-base-100 flex min-h-screen flex-col">
        <AuthSessionProvider>
          <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem={true}>
            <Header />
            <GoogleAnalytics />
            <ExternalBrowserBanner />
            <main className="container mx-auto flex-grow px-4 py-6 pt-16">{children}</main>
            <Footer />
            <Toaster position="top-right" />
          </ThemeProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
