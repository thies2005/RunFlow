'use client';

import { Calendar, Target, Timer } from 'lucide-react';
import { differenceInDays, differenceInWeeks, format } from 'date-fns';
import { useRouter } from 'next/navigation';
import type { Goal } from '@/lib/types';
import { calculateProjectedGoalTime, calculateWeeksUntilRace, type PlanSettings } from '@/lib/metrics/goalProjection';
import type { RaceDistance } from '@/lib/metrics/vdot';

interface RaceCountdownProps {
    goal: Goal | null;
    weeklyMileage?: number; // Current week's mileage in km
    className?: string;
    marathonShape?: number;
    effectiveVO2max?: number;
    correctionFactor?: number;
}

const raceLabels: Record<string, string> = {
    FIVE_K: '5K',
    TEN_K: '10K',
    HALF_MARATHON: 'Half Marathon',
    MARATHON: 'Marathon',
};

const raceDistanceMap: Record<string, RaceDistance> = {
    'FIVE_K': '5K',
    'TEN_K': '10K',
    'HALF_MARATHON': 'HALF',
    'MARATHON': 'MARATHON',
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

export function RaceCountdown({
    goal,
    weeklyMileage = 0,
    className = '',
    marathonShape = 0,
    effectiveVO2max = 30, // Default to avoid division by zero
    correctionFactor = 1.0
}: RaceCountdownProps) {
    const router = useRouter();

    if (!goal) {
        return (
            <div className={`glass-card p-6 animate-slide-in ${className}`} style={{ animationDelay: '0.1s' }}>
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

    // Dynamic Prediction Calculation
    // NOTE: effectiveVO2max already includes the correctionFactor from the API
    // Do NOT multiply again to avoid compounding
    const currentVdot = effectiveVO2max;
    const targetDistance = raceDistanceMap[goal.raceType] || 'MARATHON';

    // Calculate weeks until race for the projection
    const weeksUntil = calculateWeeksUntilRace(raceDate);

    const planSettings: PlanSettings = {
        durationWeeks: weeksUntil,
        runsPerWeek: goal.runsPerWeek || 4,
        weeklyMileageGoal: (goal.weeklyMileageGoal || 40000) / 1000,
        raceDistance: targetDistance,
        taperWeeks: goal.taperWeeks,
        peakWeeks: goal.peakWeeks,
        buildWeeks: goal.buildWeeks,
    };

    // Calculate dynamic projection based on CURRENT fitness + plan improvement
    const projection = calculateProjectedGoalTime(
        currentVdot,
        planSettings,
        marathonShape, // Use current marathon shape
        weeklyMileage // Use current weekly mileage
    );

    const dynamicPredictedTime = projection.projectedTime;

    return (
        <div className={`glass-card p-6 animate-slide-in ${className}`} style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-300">Race Goal</h2>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.push('/plan')}
                        className="text-xs text-accent-orange hover:text-accent-pink transition-colors"
                    >
                        View Full Plan →
                    </button>
                    <span className="badge badge-run">{raceLabels[goal.raceType]}</span>
                </div>
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
            <div className="grid grid-cols-2 gap-4 mb-6">
                {goal.targetTime && (
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
                            <Target className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wide">Goal</p>
                            <p className="text-xl font-bold text-white">{formatTime(goal.targetTime)}</p>
                        </div>
                    </div>
                )}

                {dynamicPredictedTime > 0 && (
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-orange to-accent-pink flex items-center justify-center">
                            <Timer className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wide">
                                Predicted
                                {correctionFactor !== 1.0 && <span className="ml-1 text-[10px] text-accent-cyan" title="Using calibrated VO2max">●</span>}
                            </p>
                            <p className="text-xl font-bold text-white">{formatTime(dynamicPredictedTime)}</p>
                            <p className="text-[10px] text-gray-500">VO2max {currentVdot.toFixed(1)}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Weekly mileage */}
            {goal.weeklyMileageGoal && (
                <div className="glass-card p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-400">This Week&apos;s Mileage</span>
                        <span className="text-sm text-white">
                            {weeklyMileage.toFixed(1)} / {(goal.weeklyMileageGoal / 1000).toFixed(1)} km
                        </span>
                    </div>
                    <div className="h-2 bg-background rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-accent-cyan to-green-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, (weeklyMileage / (goal.weeklyMileageGoal / 1000)) * 100)}%` }}
                        />
                    </div>
                </div>
            )
            }
        </div >
    );
}
