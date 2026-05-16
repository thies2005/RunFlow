import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'Free Training Plan Generator — RunFlow',
    description: 'Generate a free, personalized running or triathlon training plan for any race distance. No sign-up required. Export as HTML, PDF, or CSV.',
    keywords: ['training plan generator', 'running plan', 'marathon plan', 'half marathon plan', '5K plan', '10K plan', 'triathlon plan', 'free training plan'],
    openGraph: {
        title: 'Free Training Plan Generator — RunFlow',
        description: 'Generate a personalized training plan for any race distance. No sign-up required.',
        type: 'website',
    },
};

export default function PlanGeneratorLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className={`min-h-screen bg-background text-foreground ${inter.className}`}>
            {children}
        </div>
    );
}
