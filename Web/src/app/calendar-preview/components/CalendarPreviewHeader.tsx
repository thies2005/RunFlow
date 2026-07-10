'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, CalendarRange, FlaskConical } from 'lucide-react';

/**
 * Slim header for the preview route: back nav + title + sample badge.
 * Mirrors the inline-header convention used by /analytics and other top-level
 * pages (ArrowLeft -> router.push('/')).
 */
export function CalendarPreviewHeader() {
    const router = useRouter();
    return (
        <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800 bg-gradient-to-r from-zinc-950 to-zinc-900 shrink-0">
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => router.push('/')}
                    className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                    title="Back to Dashboard"
                >
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <CalendarRange className="w-4 h-4 text-orange-400" />
                <h1 className="text-sm font-semibold text-zinc-100">Training Calendar</h1>
            </div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px] border border-amber-500/20">
                <FlaskConical className="w-3 h-3" />
                Sample
            </span>
        </div>
    );
}
