'use client';

import { useRouter } from 'next/navigation';
import { CalendarView } from '@/components/views/CalendarView';
import { Footer } from '@/components/Footer';
import { AppTopBar } from '@/components/layout/AppTopBar';

/**
 * Standalone /calendar route.
 * Renders on both mobile and desktop.
 */
export default function CalendarPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <AppTopBar
                rightSlot={
                    <button
                        type="button"
                        onClick={() => router.push('/plan-advanced')}
                        className="topbar-btn px-2.5 py-1.5 text-xs font-medium border border-line rounded-md hover:border-foreground-muted transition-colors"
                    >
                        Plan Studio
                    </button>
                }
            />

            <div className="flex-1 flex flex-col">
                <CalendarView showHeader={false} />
            </div>

            <Footer />
        </div>
    );
}
