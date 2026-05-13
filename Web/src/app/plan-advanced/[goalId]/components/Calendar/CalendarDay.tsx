'use client';

import { format, isToday, isSameDay } from 'date-fns';
import { WorkoutDot } from './WorkoutDot';

interface CalendarDayProps {
    date: Date;
    workouts: Array<{ workoutType: string }>;
    raceDate?: Date | null;
    selectedDate?: Date | null;
    onClick?: (date: Date) => void;
}

export function CalendarDay({ date, workouts, raceDate, selectedDate, onClick }: CalendarDayProps) {
    const today = isToday(date);
    const isRaceDay = raceDate ? isSameDay(date, raceDate) : false;
    const isSelected = selectedDate ? isSameDay(date, selectedDate) : false;
    const dayNumber = date.getDate();
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

    return (
        <button
            type="button"
            onClick={() => onClick?.(date)}
            className={`
                flex flex-col items-center justify-center p-0.5 rounded-md transition-colors
                ${today ? 'ring-1 ring-orange-400/50 bg-orange-500/10' : ''}
                ${isSelected ? 'bg-zinc-700' : 'hover:bg-zinc-800/60'}
                ${isWeekend ? 'text-zinc-500' : 'text-zinc-300'}
                w-full h-7 text-xs
            `}
        >
            <span className={`text-[10px] leading-none ${today ? 'text-orange-400 font-bold' : ''}`}>
                {dayNumber}
            </span>
            {isRaceDay ? (
                <span className="text-[8px] text-purple-400 leading-none mt-0.5">&#9670;</span>
            ) : workouts.length > 0 ? (
                <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                    {workouts.slice(0, 3).map((w, i) => (
                        <WorkoutDot key={i} type={w.workoutType} size="sm" />
                    ))}
                    {workouts.length > 3 && (
                        <span className="text-[7px] text-zinc-500">+{workouts.length - 3}</span>
                    )}
                </div>
            ) : null}
        </button>
    );
}
