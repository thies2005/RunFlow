'use client';

import { CalendarView } from '@/components/views/CalendarView';
import { CalendarPreviewHeader } from './components/CalendarPreviewHeader';
import { Footer } from '@/components/Footer';

/**
 * /calendar-preview — the original mockup route.
 *
 * Now reuses the live CalendarView (same component as the real /calendar tab
 * and the mobile Calendar tab), just wrapped in the standalone "Sample"
 * header. Kept as a convenience entry point; the production route is /calendar.
 */
export default function CalendarPreviewPage() {
    return (
        <div className="h-screen flex flex-col bg-zinc-950 text-zinc-100">
            <CalendarPreviewHeader />
            <div className="flex-1 flex flex-col min-h-0">
                <CalendarView showHeader={false} />
            </div>
            <div className="shrink-0">
                <Footer />
            </div>
        </div>
    );
}
