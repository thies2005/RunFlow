'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, CalendarRange } from 'lucide-react';
import { CalendarView } from '@/components/views/CalendarView';
import { Footer } from '@/components/Footer';

/**
 * Standalone /calendar route.
 * Renders on both mobile and desktop.
 */
export default function CalendarPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <header className="topbar sticky top-0 z-50 border-b border-glass-border bg-background/85 backdrop-blur-md pt-[env(safe-area-inset-top)]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-14">
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => router.push('/')}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-surface border border-glass-border text-foreground-muted hover:text-foreground hover:border-foreground-muted transition-colors"
                                title="Back to Dashboard"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                <span>Dashboard</span>
                            </button>
                            <div className="h-4 w-px bg-glass-border hidden sm:block" />
                            <div className="flex items-center gap-2">
                                <CalendarRange className="w-5 h-5 text-accent-orange" />
                                <h1 className="text-base sm:text-lg font-bold text-foreground">Training Calendar</h1>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex-1 flex flex-col">
                <CalendarView showHeader={false} />
            </div>

            <Footer />
        </div>
    );
}
