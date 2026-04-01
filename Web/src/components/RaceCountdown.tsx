import { Calendar, Target, Timer, Trophy, CheckCircle, Loader2, Trash2 } from 'lucide-react';
import { differenceInDays, differenceInWeeks, format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import type { Goal, SuggestedRaceActivity } from '@/lib/types';
import { calculateProjectedGoalTime, calculateWeeksUntilRace, type PlanSettings } from '@/lib/metrics/goalProjection';
import type { RaceDistance } from '@/lib/metrics/vdot';
import { useUserMetrics } from './providers/UserMetricsProvider';
import { formatDistanceWithUnit, formatPace as formatPaceWithUnits, useUnits } from '@/lib/units';

interface RaceCountdownProps {
    goal: Goal | null;
    className?: string;
    onSelectRace?: (_goal: Goal, _activity: SuggestedRaceActivity | null, _mode: 'suggest' | 'review' | 'pick') => void;
    isIncompleteArchived?: boolean;
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
    className = '',
    onSelectRace,
    isIncompleteArchived = false,
}: RaceCountdownProps) {
    const router = useRouter();
    const {
        marathonShape,
        effectiveVO2max,
        correctionFactor,
        currentWeekMileage
    } = useUserMetrics();

    const shapePercent = marathonShape?.shape || 0;

    if (!goal) {
        return (
            <div className={`glass-card p-6 animate-slide-in ${className}`} style={{ animationDelay: '0.1s' }}>
                <h2 className="text-lg font-semibold text-gray-400 mb-4">Race Goal</h2>
                <div className="text-center py-8">
                    <Trophy className="w-16 h-16 mx-auto text-gray-400 mb-4 block" />
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

    // Auto-archive check: 14 days past race date with no race result
    const isOverdue = !isIncompleteArchived && daysToRace < -14 && !goal.raceResult;

    // POST-RACE STATE: Race date passed, no race result linked
    if ((daysToRace <= 0 || isIncompleteArchived) && !goal.raceResult && !isOverdue) {
        return <PostRacePending goal={goal} daysToRace={daysToRace} onSelectRace={onSelectRace} className={className} isIncompleteArchived={isIncompleteArchived} />;
    }

    if (isOverdue) {
        return <PostRaceOverdue goal={goal} className={className} />;
    }

    // ACTIVE STATE: Race is in the future
    const totalWeeks = goal.planWeeks || 12;
    const weeksCompleted = Math.max(0, totalWeeks - weeksToRace);
    const progressPercent = Math.min(100, (weeksCompleted / totalWeeks) * 100);

    const currentVdot = effectiveVO2max;
    const targetDistance = raceDistanceMap[goal.raceType] || 'MARATHON';
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

    const projection = calculateProjectedGoalTime(
        currentVdot,
        planSettings,
        shapePercent,
        currentWeekMileage
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
                        View Full Plan &rarr;
                    </button>
                    <span className="badge badge-run">{raceLabels[goal.raceType]}</span>
                </div>
            </div>

            <div className="mb-6">
                <h3 className="text-xl font-bold text-white mb-1">{goal.name}</h3>
                <div className="flex items-center gap-2 text-gray-400">
                    <Calendar className="w-4 h-4" />
                    <span>{format(raceDate, 'MMMM d, yyyy')}</span>
                </div>
            </div>

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
                            <p className="text-xs text-gray-400 uppercase tracking-wide flex items-center gap-1">
                                Projected Finish
                                <span className="cursor-help" title="Estimated finish time on race day based on your training plan and expected fitness improvement">&#8505;</span>
                                {correctionFactor !== 1.0 && <span className="ml-1 text-[10px] text-accent-cyan" title="Using calibrated VO2max">&#9679;</span>}
                            </p>
                            <p className="text-xl font-bold text-white">{formatTime(dynamicPredictedTime)}</p>
                            <p className="text-[10px] text-gray-500">Target VO2max {projection.projectedVdot.toFixed(1)}</p>
                        </div>
                    </div>
                )}
            </div>

            {goal.workouts && goal.workouts.length > 0 && (() => {
                const plannedWeekMileage = goal.workouts.reduce((acc, workout) => {
                    const isRun = ['EASY', 'LONG_RUN', 'TEMPO', 'INTERVALS', 'RECOVERY', 'RACE'].includes(workout.workoutType);
                    if (isRun && workout.targetDistance) {
                        return acc + workout.targetDistance;
                    }
                    return acc;
                }, 0) / 1000;

                if (plannedWeekMileage <= 0) return null;

                return (
                    <div className="glass-card p-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-400">This Week&apos;s Mileage</span>
                            <span className="text-sm text-white">
                                {currentWeekMileage.toFixed(1)} / {plannedWeekMileage.toFixed(1)} km
                            </span>
                        </div>
                        <div className="h-2 bg-background rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-accent-cyan to-green-500 rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(100, (currentWeekMileage / plannedWeekMileage) * 100)}%` }}
                            />
                        </div>
                    </div>
                );
            })()
            }
        </div>
    );
}

function PostRacePending({ goal, daysToRace, onSelectRace, className, isIncompleteArchived = false }: {
    goal: Goal;
    daysToRace: number;
    onSelectRace?: RaceCountdownProps['onSelectRace'];
    className: string;
    isIncompleteArchived?: boolean;
}) {
    const { useImperial } = useUnits();
    const queryClient = useQueryClient();

    const deleteMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/goals?goalId=${goal.id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete plan');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
        },
    });
    const { data: suggestData, isLoading: suggestLoading } = useQuery({
        queryKey: ['suggest-race', goal.id],
        queryFn: async () => {
            const res = await fetch(`/api/goals/${goal.id}/suggest-race`);
            if (!res.ok) throw new Error('Failed to suggest race');
            return res.json();
        },
        staleTime: 60000,
        retry: false,
    });

    const { data: planData } = useQuery({
        queryKey: ['plan', goal.id, 'full'],
        queryFn: async () => {
            const res = await fetch(`/api/plan?goalId=${goal.id}`);
            if (!res.ok) throw new Error('Failed to fetch plan');
            return res.json();
        },
        staleTime: 60000,
    });

    const suggestions: SuggestedRaceActivity[] = suggestData?.suggestions || [];
    const topSuggestion = suggestions.length > 0 ? suggestions[0] : null;

    const workouts = planData?.goal?.workouts || goal.workouts || [];
    const workoutStats = workouts
        ? {
            total: workouts.length,
            completed: workouts.filter((w: NonNullable<Goal['workouts']>[number]) => w.isCompleted).length,
        }
        : { total: 0, completed: 0 };
    const completionRate = workoutStats.total > 0
        ? Math.round((workoutStats.completed / workoutStats.total) * 100)
        : 0;

    return (
        <div className={`glass-card p-6 animate-slide-in ${className}`} style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-300">Race Goal</h2>
                <span className="badge badge-run">{raceLabels[goal.raceType]}</span>
            </div>

            <div className="mb-4">
                <h3 className="text-xl font-bold text-white mb-1">{goal.name}</h3>
                <div className="flex items-center gap-2 text-gray-400">
                    <Calendar className="w-4 h-4" />
                    <span>{format(new Date(goal.raceDate), 'MMMM d, yyyy')}</span>
                </div>
            </div>

            <div className="bg-accent-pink/10 border border-accent-pink/30 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-2 mb-1">
                    <Trophy className="w-5 h-5 text-accent-pink" />
                    <p className="font-semibold text-accent-pink">
                        {isIncompleteArchived ? 'Unfinished Race' : 'Race Week!'}
                    </p>
                </div>
                <p className="text-sm text-gray-300">
                    {isIncompleteArchived
                        ? 'This race was not recorded. Would you like to link your race result or remove this plan?'
                        : daysToRace === 0 ? "Today is race day!" : daysToRace >= -1 ? "The race has passed!" : `The race was ${Math.abs(daysToRace)} days ago.`}
                </p>
            </div>

            {/* Training completion summary */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 mb-4">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-400">Training Completion</span>
                    <span className="text-sm font-medium text-white">{completionRate}%</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full ${completionRate >= 80 ? 'bg-green-500' : completionRate >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${completionRate}%` }}
                    />
                </div>
                <p className="text-[10px] text-gray-500 mt-1">{workoutStats.completed}/{workoutStats.total} workouts completed</p>
            </div>

            {/* Auto-detect section */}
            {suggestLoading ? (
                <div className="flex items-center justify-center py-4 text-gray-400">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    <span className="text-sm">Looking for your race...</span>
                </div>
            ) : topSuggestion ? (
                <div className="space-y-3">
                    <p className="text-sm text-gray-300">We found a run near your race date:</p>

                    <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-accent-orange/20 flex items-center justify-center">
                                <Trophy className="w-4 h-4 text-accent-orange" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">{topSuggestion.name}</p>
                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                    <span>{format(new Date(topSuggestion.startDate), 'MMM d')}</span>
                                    <span>{formatDistanceWithUnit(topSuggestion.distance, useImperial, 1)}</span>
                                    <span>{formatTime(topSuggestion.movingTime)}</span>
                                    {topSuggestion.averageSpeed && (
                                        <span>{formatPaceWithUnits(1000 / topSuggestion.averageSpeed, useImperial)}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => onSelectRace?.(goal, topSuggestion, 'suggest')}
                        className="w-full btn-primary py-3 flex items-center justify-center gap-2"
                    >
                        <CheckCircle className="w-4 h-4" />
                        Yes, that&apos;s my race!
                    </button>

                    <button
                        onClick={() => onSelectRace?.(goal, null, 'pick')}
                        className="w-full py-2.5 border border-white/10 text-gray-300 rounded-lg hover:bg-white/5 transition-colors text-sm"
                    >
                        Pick a different run
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    <p className="text-sm text-gray-400">No matching run found near your race date.</p>
                    <button
                        onClick={() => onSelectRace?.(goal, null, 'pick')}
                        className="w-full btn-primary py-3"
                    >
                        Select your race run
                    </button>
                </div>
            )}

            {isIncompleteArchived ? (
                <button
                    onClick={() => deleteMutation.mutate()}
                    disabled={deleteMutation.isPending}
                    className="w-full flex items-center justify-center gap-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors py-2 rounded-lg disabled:opacity-50"
                >
                    {deleteMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    Delete Plan
                </button>
            ) : (
                <button
                    onClick={() => onSelectRace?.(goal, null, 'suggest')}
                    className="w-full text-xs text-gray-500 hover:text-gray-300 transition-colors py-2"
                >
                    I didn&apos;t race / Skip for now
                </button>
            )}
        </div>
    );
}

function PostRaceOverdue({ goal, className }: { goal: Goal; className: string }) {
    const router = useRouter();

    return (
        <div className={`glass-card p-6 animate-slide-in ${className}`} style={{ animationDelay: '0.1s' }}>
            <h2 className="text-lg font-semibold text-gray-400 mb-4">Race Goal</h2>
            <div className="text-center py-6">
                <Trophy className="w-16 h-16 mx-auto text-gray-500 mb-4 block" />
                <h3 className="text-lg font-bold text-white mb-1">{goal.name}</h3>
                <p className="text-gray-400 text-sm mb-4">
                    {format(new Date(goal.raceDate), 'MMMM d, yyyy')} &middot; {raceLabels[goal.raceType]}
                </p>
                <p className="text-gray-500 text-sm mb-6">This training block has concluded.</p>
                <button
                    onClick={() => router.push('/onboarding?step=3')}
                    className="btn-primary"
                >
                    Create Training Plan
                </button>
            </div>
        </div>
    );
}
