'use client';

import { format } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarHeaderProps {
    month: Date;
    onPrevMonth: () => void;
    onNextMonth: () => void;
}

export function CalendarHeader({ month, onPrevMonth, onNextMonth }: CalendarHeaderProps) {
    return (
        <div className="flex items-center justify-between px-2 py-1.5">
            <button
                type="button"
                onClick={onPrevMonth}
                className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors"
            >
                <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wide">
                {format(month, 'MMMM yyyy')}
            </span>
            <button
                type="button"
                onClick={onNextMonth}
                className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors"
            >
                <ChevronRight className="w-4 h-4" />
            </button>
        </div>
    );
}
