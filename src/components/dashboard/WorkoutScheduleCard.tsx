import { Workout } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { Edit2, Check } from 'lucide-react';

interface WorkoutScheduleCardProps {
    weeklyWorkouts: Workout[];
    today: string;
    currentWeekMileage: number;
    onEditWorkout: (workout: Workout) => void;
    onCompleteWorkout: (workout: Workout) => void;
}

export default function WorkoutScheduleCard({ weeklyWorkouts, today, currentWeekMileage, onEditWorkout, onCompleteWorkout }: WorkoutScheduleCardProps) {
    const router = useRouter();

    // Find interesting workouts logic moved here
    const firstUncompletedIndex = weeklyWorkouts.findIndex((w: Workout) => !w.isCompleted);

    // Calculate Planned Mileage (only runs)
    const plannedWeekMileage = weeklyWorkouts.reduce((acc, workout) => {
        // Check if it's a running workout type
        const isRun = ['EASY', 'LONG_RUN', 'TEMPO', 'INTERVALS', 'RECOVERY', 'RACE'].includes(workout.workoutType);
        if (isRun && workout.targetDistance) {
            return acc + workout.targetDistance;
        }
        return acc;
    }, 0);

    return (
        <div className="glass-card p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-300">This Week's Workouts</h2>
                <div className="text-xs font-mono text-gray-400 bg-white/5 px-2 py-1 rounded border border-white/5">
                    <span className="text-white font-bold">{currentWeekMileage.toFixed(1)}</span>
                    <span className="opacity-50"> / </span>
                    <span>{(plannedWeekMileage / 1000).toFixed(1)} km</span>
                </div>
            </div>
            {weeklyWorkouts.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                    {weeklyWorkouts.map((workout: Workout, index: number) => {
                        const workoutDate = new Date(workout.scheduledDate);
                        const isWorkoutToday = workoutDate.toDateString() === today;
                        const isNextWorkout = index === firstUncompletedIndex;
                        const isTodayPending = !workout.isCompleted && isWorkoutToday;
                        const isNextPending = !workout.isCompleted && isNextWorkout;

                        return (
                            <div key={workout.id || index} className={`p-3 rounded-lg border transition-all ${workout.isCompleted
                                ? 'bg-green-500/5 border-green-500/20'
                                : isTodayPending
                                    ? 'bg-accent-orange/10 border-accent-orange/50 shadow-[0_0_15px_rgba(249,115,22,0.3)]'
                                    : isNextPending
                                        ? 'bg-accent-orange/10 border-accent-orange/30'
                                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                                }`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${workout.isCompleted ? 'bg-green-500/20' : (isTodayPending || isNextPending) ? 'bg-accent-orange/20' : 'bg-white/10'}`}>
                                            <span className="text-sm">{workout.workoutType === 'EASY' ? '🏃' : workout.workoutType === 'LONG_RUN' ? '🚀' : workout.workoutType === 'TEMPO' ? '⚡' : workout.workoutType === 'INTERVALS' ? '🔥' : workout.workoutType === 'STRENGTH' ? '💪' : workout.workoutType === 'REST' ? '😴' : workout.workoutType === 'RIDE' ? '🚴' : workout.workoutType === 'SWIM' ? '🏊' : '🎯'}</span>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className={`font-medium ${workout.isCompleted ? 'text-green-400' : (isTodayPending || isNextPending) ? 'text-accent-orange' : 'text-white'}`}>
                                                    {workout.description || workout.workoutType?.replace('_', ' ')}
                                                </p>
                                                {isWorkoutToday && (
                                                    <span className="text-[10px] bg-accent-orange/20 text-accent-orange px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">Today</span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500">
                                                {workout.targetDistance ? `${(workout.targetDistance / 1000).toFixed(1)} km` : workout.targetDuration ? `${Math.round(workout.targetDuration / 60)} min` : ''}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {!workout.isCompleted && (
                                            <>
                                                <button
                                                    onClick={() => onEditWorkout(workout)}
                                                    className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
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
                                            <span className="text-green-400 text-xs flex items-center gap-1">
                                                <Check className="w-3 h-3" /> Done
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-6">
                    <p className="text-gray-500 text-sm">No workouts scheduled</p>
                    <button onClick={() => router.push('/onboarding?step=3')} className="text-xs text-accent-orange mt-2 hover:underline">
                        Set up a training plan
                    </button>
                </div>
            )}
        </div>
    );
}
