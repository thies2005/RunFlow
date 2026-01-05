import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'RunFlow | Your Running Performance Dashboard',
    description: 'Runna-style training interface with Runalyze-grade analytics. Track your running performance, cross-training, and race predictions.',
    keywords: ['running', 'training', 'Strava', 'VDOT', 'marathon', 'trimp', 'fitness'],
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className="dark">
            <body className={inter.className}>
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
