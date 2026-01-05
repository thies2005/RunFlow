'use client';

import { Calendar, Target, TrendingUp, Timer } from 'lucide-react';
import { differenceInDays, differenceInWeeks, format } from 'date-fns';
import { useRouter } from 'next/navigation';

interface Goal {
    id: string;
    name: string;
    raceType: 'FIVE_K' | 'TEN_K' | 'HALF_MARATHON' | 'MARATHON';
    raceDate: string;
    targetTime?: number | null;
    currentVdot?: number | null;
    predictedTime?: number | null;
    weeklyMileageGoal?: number | null;
}

interface RaceCountdownProps {
    goal: Goal | null;
    weeklyMileage?: number; // Current week's mileage in km
}

const raceLabels: Record<string, string> = {
    FIVE_K: '5K',
    TEN_K: '10K',
    HALF_MARATHON: 'Half Marathon',
    MARATHON: 'Marathon',
};

function formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
        return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function RaceCountdown({ goal, weeklyMileage = 0 }: RaceCountdownProps) {
    const router = useRouter();

    if (!goal) {
        return (
            <div className="glass-card p-6 animate-slide-in" style={{ animationDelay: '0.1s' }}>
                <h2 className="text-lg font-semibold text-gray-400 mb-4">Race Goal</h2>
                <div className="text-center py-8">
                    <span className="text-4xl mb-4 block">🏁</span>
                    <p className="text-gray-400">No race goal set</p>
                    <button
                        onClick={() => router.push('/onboarding?step=3')}
                        className="btn-secondary mt-4"
                    >
                        Set Your Goal
                    </button>
                </div>
            </div>
        );
    }

    const raceDate = new Date(goal.raceDate);
    const today = new Date();
    const daysToRace = differenceInDays(raceDate, today);
    const weeksToRace = differenceInWeeks(raceDate, today);

    // Calculate progress through training plan (assume 12-week plan)
    const totalWeeks = 12;
    const weeksCompleted = Math.max(0, totalWeeks - weeksToRace);
    const progressPercent = Math.min(100, (weeksCompleted / totalWeeks) * 100);

    return (
        <div className="glass-card p-6 animate-slide-in" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-300">Race Goal</h2>
                <span className="badge badge-run">{raceLabels[goal.raceType]}</span>
            </div>

            {/* Race name and date */}
            <div className="mb-6">
                <h3 className="text-xl font-bold text-white mb-1">{goal.name}</h3>
                <div className="flex items-center gap-2 text-gray-400">
                    <Calendar className="w-4 h-4" />
                    <span>{format(raceDate, 'MMMM d, yyyy')}</span>
                </div>
            </div>

            {/* Countdown display */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="glass-card p-4 text-center">
                    <p className="stat-value-accent text-4xl font-bold">{daysToRace}</p>
                    <p className="text-sm text-gray-400 mt-1">days to go</p>
                </div>
                <div className="glass-card p-4 text-center">
                    <p className="stat-value text-4xl font-bold">{weeksToRace}</p>
                    <p className="text-sm text-gray-400 mt-1">weeks</p>
                </div>
            </div>

            {/* Training progress bar */}
            <div className="mb-6">
                <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-400">Training Progress</span>
                    <span className="text-white font-medium">Week {weeksCompleted} of {totalWeeks}</span>
                </div>
                <div className="h-2 bg-background-tertiary rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-accent-orange to-accent-pink rounded-full transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
            </div>

            {/* VDOT & Predicted Time */}
            {goal.currentVdot && (
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-purple to-accent-pink flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wide">VDOT</p>
                            <p className="text-xl font-bold text-white">{goal.currentVdot.toFixed(1)}</p>
                        </div>
                    </div>

                    {goal.predictedTime && (
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-orange to-accent-pink flex items-center justify-center">
                                <Timer className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 uppercase tracking-wide">Predicted</p>
                                <p className="text-xl font-bold text-white">{formatTime(goal.predictedTime)}</p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Weekly mileage */}
            {goal.weeklyMileageGoal && (
                <div className="glass-card p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-400">This Week&apos;s Mileage</span>
                        <span className="text-sm text-white">
                            {weeklyMileage.toFixed(1)} / {goal.weeklyMileageGoal.toFixed(0)} km
                        </span>
                    </div>
                    <div className="h-2 bg-background rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-accent-cyan to-green-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, (weeklyMileage / goal.weeklyMileageGoal) * 100)}%` }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
