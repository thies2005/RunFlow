import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import DeepLinkHandler from '@/components/DeepLinkHandler';
import AdaptiveLayout from './adaptive-layout';
import CookieBanner from '@/components/CookieBanner';
import { PendingConsentHandler } from '@/components/PendingConsentHandler';
import ReconsentBanner from '@/components/layout/ReconsentBanner';

const inter = Inter({
    subsets: ['latin'],
    display: 'swap',
    preload: true,
    fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
});

export const metadata: Metadata = {
    title: 'RunFlow | Your Running Performance Dashboard',
    description: 'Runna-style training interface with Runalyze-grade analytics. Track your running performance, cross-training, and race predictions.',
    keywords: ['running', 'training', 'Strava', 'VDOT', 'marathon', 'trimp', 'fitness'],
    appleWebApp: {
        capable: true,
        statusBarStyle: "default",
        title: "RunFlow",
    },
    other: {
        'apple-mobile-web-app-capable': 'yes',
        'mobile-web-app-capable': 'yes',
    },
};

export const viewport: Viewport = {
    themeColor: '#0a0a0f',
    interactiveWidget: 'resizes-content',
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link rel="dns-prefetch" href="https://www.strava.com" />
                <link rel="dns-prefetch" href="https://dgalywyr863hv.cloudfront.net" />
            </head>
            <body className={inter.className}>
                <Providers>
                    <a
                        href="#main-content"
                        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:text-black"
                    >
                        Skip to content
                    </a>
                    <main id="main-content" role="main">
                        <AdaptiveLayout>{children}</AdaptiveLayout>
                    </main>
                    <PendingConsentHandler />
                    <ReconsentBanner />
                </Providers>
                <CookieBanner />
                <DeepLinkHandler />
            </body>
        </html>
    );
}


