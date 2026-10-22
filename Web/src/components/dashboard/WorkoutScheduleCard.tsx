import { Workout } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { Edit2, Check, Activity, Zap, Flame, Dumbbell, Moon, Bike, Waves, Target, Rocket, Download } from 'lucide-react';
import { generateMyWhooshZwoXml } from '@/lib/plans/zwoExporter';

interface WorkoutScheduleCardProps {
    weeklyWorkouts: Workout[];
    today: string;
    onEditWorkout: (_workout: Workout) => void;
    onCompleteWorkout: (_workout: Workout) => void;
}

const CYCLING_WORKOUT_TYPES = new Set(['RIDE', 'LONG_RIDE', 'RIDE_INTERVALS', 'BRICK']);

function exportMyWhooshZwo(workout: Workout) {
    const customName = (workout as Workout & { customName?: string | null }).customName;
    const xml = generateMyWhooshZwoXml({
        name: customName || workout.description || workout.workoutType,
        description: workout.description || '',
        workoutType: workout.workoutType,
        targetDurationSeconds: workout.targetDuration || 3600,
        phase: workout.phase || undefined,
        structuredSteps: (workout as unknown as { structuredSteps?: any }).structuredSteps ?? null,
    });
    const blob = new Blob([xml], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = (customName || workout.description || workout.workoutType || 'ride')
        .replace(/[^a-z0-9-_]+/gi, '_')
        .slice(0, 48);
    a.download = `RunFlow_${safeName}.zwo`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

export default function WorkoutScheduleCard({ weeklyWorkouts, today, onEditWorkout, onCompleteWorkout }: WorkoutScheduleCardProps) {
    const router = useRouter();

    // Hide "This Week's Workouts" card completely when no workouts are scheduled
    if (!weeklyWorkouts || weeklyWorkouts.length === 0) {
        return null;
    }

    // Find interesting workouts logic moved here
    const firstUncompletedIndex = weeklyWorkouts.findIndex((w: Workout) => !w.isCompleted);

    return (
        <div className="glass-card p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">This Week&apos;s Workouts</h2>
            </div>
            {weeklyWorkouts.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                    {weeklyWorkouts.map((workout: Workout, index: number) => {
                        const workoutDate = new Date(workout.scheduledDate);
                        const isWorkoutToday = workoutDate.toDateString() === today;
                        const isNextWorkout = index === firstUncompletedIndex;
                        const isTodayPending = !workout.isCompleted && isWorkoutToday;
                        const isNextPending = !workout.isCompleted && isNextWorkout;
                        const isCyclingWorkout = CYCLING_WORKOUT_TYPES.has(workout.workoutType);

                        return (
                            <div key={workout.id || index} className={`p-3 rounded-md border transition-colors ${workout.isCompleted
                                ? 'bg-positive/5 border-positive/20'
                                : isTodayPending
                                    ? 'bg-accent-orange/10 border-accent-orange/50 intensity-border'
                                    : isNextPending
                                        ? 'bg-accent-orange/10 border-accent-orange/30'
                                        : 'bg-surface border-line hover:bg-surface-hover'
                                }`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${workout.isCompleted ? 'bg-positive/20' : (isTodayPending || isNextPending) ? 'bg-accent-orange/20' : 'bg-surface'}`}>
                                            {workout.workoutType === 'EASY' ? <Activity className="w-4 h-4" /> : workout.workoutType === 'LONG_RUN' ? <Rocket className="w-4 h-4" /> : workout.workoutType === 'TEMPO' ? <Zap className="w-4 h-4" /> : workout.workoutType === 'INTERVALS' ? <Flame className="w-4 h-4" /> : workout.workoutType === 'FARTLEK' ? <Zap className="w-4 h-4" /> : workout.workoutType === 'STRENGTH' ? <Dumbbell className="w-4 h-4" /> : workout.workoutType === 'REST' ? <Moon className="w-4 h-4" /> : isCyclingWorkout ? <Bike className="w-4 h-4" /> : (workout.workoutType === 'SWIM' || workout.workoutType === 'OPEN_WATER_SWIM') ? <Waves className="w-4 h-4" /> : <Target className="w-4 h-4" />}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className={`font-medium ${workout.isCompleted ? 'text-positive' : (isTodayPending || isNextPending) ? 'text-accent-orange' : 'text-foreground'}`}>
                                                    {(workout as Workout & { customName?: string | null }).customName || workout.description || workout.workoutType?.replace(/_/g, ' ')}
                                                </p>
                                                {isWorkoutToday && (
                                                    <span className="text-[10px] bg-accent-orange/20 text-accent-orange px-1.5 py-0.5 rounded-full font-semibold">Today</span>
                                                )}
                                            </div>
                                            <p className="text-xs text-foreground-muted font-mono tabular-nums">
                                                {workout.targetDistance ? `${(workout.targetDistance / 1000).toFixed(1)} km` : workout.targetDuration ? `${Math.round(workout.targetDuration / 60)} min` : ''}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {!workout.isCompleted && (
                                            <>
                                                <button
                                                    onClick={() => onEditWorkout(workout)}
                                                    className="p-1.5 text-foreground-muted hover:text-foreground hover:bg-surface-hover rounded-md transition-colors"
                                                    title="Edit workout"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => onCompleteWorkout(workout)}
                                                    className="btn-primary py-1 px-3 text-xs flex items-center gap-1"
                                                >
                                                    <Check className="w-3 h-3" />
                                                    Done
                                                </button>
                                            </>
                                        )}
                                        {workout.isCompleted && (
                                            <span className="text-positive text-xs flex items-center gap-1">
                                                <Check className="w-3 h-3" /> Done
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {isCyclingWorkout && (
                                    <div className="mt-2 pt-2 border-t border-line flex items-center justify-between gap-2">
                                        <span className="text-[10px] text-foreground-muted">
                                            Upload `.zwo` to workout.mywhoosh.com
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => exportMyWhooshZwo(workout)}
                                            className="text-[10px] text-accent-cyan border border-accent-cyan/30 rounded px-2 py-0.5 hover:bg-accent-cyan/10 transition-colors inline-flex items-center gap-1"
                                        >
                                            <Download className="w-3 h-3" />
                                            Export to MyWhoosh (.zwo)
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-6">
                    <p className="text-foreground-muted text-sm">No workouts scheduled</p>
                    <button onClick={() => router.push('/onboarding?step=4')} className="text-xs text-accent-orange mt-2 hover:underline">
                        Set up a training plan
                    </button>
                </div>
            )}
        </div>
    );
}
