import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { format } from 'date-fns';
import { Plus } from 'lucide-react';

interface DroppableDayProps {
    date: Date;
    children: React.ReactNode;
    isTodayItem: boolean;
    onAdd: () => void;
}

export function DroppableDay({ date, children, isTodayItem, onAdd }: DroppableDayProps) {
    const dateStr = format(date, 'yyyy-MM-dd');
    const { setNodeRef, isOver } = useDroppable({
        id: `day-${dateStr}`,
        data: { date: dateStr },
    });

    // Check if children is empty or array of length 0 to show empty state
    const hasChildren = React.Children.count(children) > 0;

    return (
        <div
            ref={setNodeRef}
            className={`flex gap-2 p-2 rounded-lg min-h-[80px] transition-colors border ${isOver ? 'bg-white/10 border-accent-orange/50' : 'border-transparent hover:bg-white/5'} ${isTodayItem ? 'bg-accent-orange/5' : ''}`}
        >
            {/* Date Column */}
            <div className="flex flex-col items-center w-12 pt-2 shrink-0">
                <span className="text-[10px] text-gray-500 uppercase">{format(date, 'EEE')}</span>
                <span className={`text-lg font-bold ${isTodayItem ? 'text-accent-orange' : 'text-gray-300'}`}>
                    {format(date, 'd')}
                </span>
                <button
                    onClick={onAdd}
                    className="mt-2 text-gray-600 hover:text-white transition-colors"
                >
                    <Plus className="w-4 h-4" />
                </button>
            </div>

            {/* Workouts Column */}
            <div className="flex-1 space-y-2">
                {children}
                {/* Empty State Placeholder (only if no children) */}
                {!hasChildren && (
                    <div className="h-full flex items-center justify-center border border-dashed border-white/10 rounded-lg text-xs text-gray-600">
                        Rest Day
                    </div>
                )}
            </div>
        </div>
    );
}
