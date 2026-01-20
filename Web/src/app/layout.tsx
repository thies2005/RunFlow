import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { PwaLifecycle } from './pwa-lifecycle';
import DeepLinkHandler from '@/components/DeepLinkHandler';
import AdaptiveLayout from './adaptive-layout';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'RunFlow | Your Running Performance Dashboard',
    description: 'Runna-style training interface with Runalyze-grade analytics. Track your running performance, cross-training, and race predictions.',
    keywords: ['running', 'training', 'Strava', 'VDOT', 'marathon', 'trimp', 'fitness'],
    appleWebApp: {
        capable: true,
        statusBarStyle: "default",
        title: "RunFlow",
    },
};

export const viewport: Viewport = {
    themeColor: '#0a0a0f',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className={inter.className}>
                <Providers>
                    <AdaptiveLayout>{children}</AdaptiveLayout>
                </Providers>
                <PwaLifecycle />
                <DeepLinkHandler />
            </body>
        </html>
    );
}


