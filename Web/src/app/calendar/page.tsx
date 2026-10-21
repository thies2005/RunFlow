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
            <header className="topbar sticky top-0 z-50 pt-[env(safe-area-inset-top)]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-4">
                            <button
                                type="button"
                                onClick={() => router.push('/')}
                                className="p-2 transition-colors"
                                title="Back to Dashboard"
                                aria-label="Back to Dashboard"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <div className="flex items-center gap-2">
                                <CalendarRange className="w-5 h-5 text-accent-orange" />
                                <h1 className="text-xl font-bold">Training Calendar</h1>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => router.push('/plan-advanced')}
                            className="btn-secondary flex items-center gap-2 py-2 px-4 text-xs sm:text-sm"
                        >
                            Import CSV / AI Plan Studio
                        </button>
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
