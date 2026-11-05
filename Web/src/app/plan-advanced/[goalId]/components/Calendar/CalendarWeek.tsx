'use client';

import { addDays, format } from 'date-fns';
import { CalendarDay } from './CalendarDay';

interface CalendarWeekProps {
    weekStart: Date;
    workoutsByDate: Map<string, Array<{ workoutType: string }>>;
    raceDate?: Date | null;
    selectedDate?: Date | null;
    onDayClick?: (date: Date) => void;
}

export function CalendarWeek({ weekStart, workoutsByDate, raceDate, selectedDate, onDayClick }: CalendarWeekProps) {
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    return (
        <div className="grid grid-cols-7 gap-0.5">
            {days.map((day) => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const dayWorkouts = workoutsByDate.get(dateKey) || [];
                return (
                    <CalendarDay
                        key={dateKey}
                        date={day}
                        workouts={dayWorkouts}
                        raceDate={raceDate}
                        selectedDate={selectedDate}
                        onClick={onDayClick}
                    />
                );
            })}
        </div>
    );
}
