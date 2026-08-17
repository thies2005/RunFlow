'use client';

import { useState, useMemo, useCallback } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, addDays, addMonths, subMonths } from 'date-fns';
import { CalendarHeader } from './CalendarHeader';
import { CalendarWeek } from './CalendarWeek';

interface MiniCalendarProps {
    workouts: Array<{ scheduledDate: string | Date; workoutType: string }>;
    raceDate?: Date | null;
    onDayClick?: (date: Date) => void;
}

export function MiniCalendar({ workouts, raceDate, onDayClick }: MiniCalendarProps) {
    const [currentMonth, setCurrentMonth] = useState<Date>(() => {
        const today = new Date();
        return startOfMonth(today);
    });

    const workoutsByDate = useMemo(() => {
        const map = new Map<string, Array<{ workoutType: string }>>();
        for (const w of workouts) {
            const d = new Date(w.scheduledDate);
            if (isNaN(d.getTime())) continue;
            const key = d.toISOString().split('T')[0];
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push({ workoutType: w.workoutType });
        }
        return map;
    }, [workouts]);

    const weeks = useMemo(() => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(currentMonth);
        const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
        const calendarEnd = startOfWeek(monthEnd, { weekStartsOn: 1 });

        const result: Date[] = [];
        let day = calendarStart;
        while (day <= calendarEnd) {
            result.push(day);
            day = addDays(day, 7);
        }
        return result;
    }, [currentMonth]);

    const handlePrevMonth = useCallback(() => {
        setCurrentMonth((m) => subMonths(m, 1));
    }, []);

    const handleNextMonth = useCallback(() => {
        setCurrentMonth((m) => addMonths(m, 1));
    }, []);

    const dayLabels = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

    return (
        <div className="flex flex-col h-full">
            <CalendarHeader
                month={currentMonth}
                onPrevMonth={handlePrevMonth}
                onNextMonth={handleNextMonth}
            />
            <div className="px-2">
                <div className="grid grid-cols-7 gap-0.5 mb-0.5">
                    {dayLabels.map((d) => (
                        <div key={d} className="text-center text-[10px] text-foreground-muted font-medium py-0.5">
                            {d}
                        </div>
                    ))}
                </div>
                <div className="space-y-0.5">
                    {weeks.map((weekStart) => {
                        const key = format(weekStart, 'yyyy-MM-dd');
                        return (
                            <CalendarWeek
                                key={key}
                                weekStart={weekStart}
                                workoutsByDate={workoutsByDate}
                                raceDate={raceDate}
                                onDayClick={onDayClick}
                            />
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
