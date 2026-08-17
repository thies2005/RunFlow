'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, CalendarRange } from 'lucide-react';
import { CalendarView } from '@/components/views/CalendarView';
import { Footer } from '@/components/Footer';

/**
 * Standalone /calendar route (desktop / non-swipeable access).
 * The mobile swipe layout renders CalendarView directly with showHeader={false}.
 */
export default function CalendarPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <header className="border-b border-glass-border bg-background/80 backdrop-blur sticky top-0 z-50 pt-[env(safe-area-inset-top)]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-3 h-14">
                        <button
                            onClick={() => router.push('/')}
                            className="p-2 text-foreground-muted hover:text-foreground transition-colors"
                            title="Back to Dashboard"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <CalendarRange className="w-5 h-5 text-orange-400" />
                        <h1 className="text-lg font-bold text-foreground">Training Calendar</h1>
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
