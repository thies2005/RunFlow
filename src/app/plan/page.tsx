'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, Flag, Activity, Clock, Zap, Bike, Mountain, Play, Plus, Dumbbell } from 'lucide-react';
import { format, startOfWeek, endOfWeek, isToday, isPast, differenceInWeeks, addDays } from 'date-fns';
import { useSession } from 'next-auth/react';
import { EditWorkoutModal } from '@/components'; // Assuming export from index

const workoutStyles: Record<string, { color: string, icon: any, label: string }> = {
    EASY: { color: 'text-green-400', icon: Activity, label: 'Easy Run' },
    LONG_RUN: { color: 'text-blue-400', icon: Mountain, label: 'Long Run' },
    TEMPO: { color: 'text-yellow-400', icon: Zap, label: 'Tempo' },
    INTERVALS: { color: 'text-red-400', icon: Zap, label: 'Intervals' },
    RECOVERY: { color: 'text-teal-400', icon: Activity, label: 'Recovery' },
    REST: { color: 'text-gray-500', icon: Clock, label: 'Rest Day' },
    RIDE: { color: 'text-orange-400', icon: Bike, label: 'Bike Ride' },
    SWIM: { color: 'text-cyan-400', icon: Activity, label: 'Swim' },
    STRENGTH: { color: 'text-pink-400', icon: Dumbbell, label: 'Strength' },
    OTHER: { color: 'text-gray-400', icon: Activity, label: 'Other' },
    RACE: { color: 'text-purple-400', icon: Flag, label: 'Race' },
};

const RUN_TYPES = ['EASY', 'LONG_RUN', 'TEMPO', 'INTERVALS', 'RECOVERY', 'RACE', 'REPETITIONS'];

function getPhase(weeksUntilRace: number) {
    if (weeksUntilRace <= 2) return { name: 'TAPER', color: 'text-teal-400 border-teal-500/30 bg-teal-500/10' };
    if (weeksUntilRace <= 6) return { name: 'PEAK', color: 'text-purple-400 border-purple-500/30 bg-purple-500/10' };
    if (weeksUntilRace <= 10) return { name: 'BUILD', color: 'text-orange-400 border-orange-500/30 bg-orange-500/10' };
    return { name: 'BASE', color: 'text-blue-400 border-blue-500/30 bg-blue-500/10' };
}

export default function PlanPage() {
    const router = useRouter();
    const { status } = useSession();

    // Edit State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingWorkout, setEditingWorkout] = useState<any>(null);
    const [createDate, setCreateDate] = useState<Date | undefined>(undefined);

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['plan'],
        queryFn: async () => (await fetch('/api/plan')).json(),
        enabled: status === 'authenticated'
    });

    if (isLoading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading plan...</div>;

    if (!data?.goal) {
        return (
            <div className="min-h-screen p-8 flex flex-col items-center justify-center text-center">
                <h1 className="text-2xl text-white font-bold mb-4">No Active Plan</h1>
                <p className="text-gray-400 mb-6">You don't have an active training goal.</p>
                <button onClick={() => router.push('/onboarding?step=3')} className="btn-primary">Create Goal</button>
            </div>
        );
    }

    const goal = data.goal;
    const raceDate = new Date(goal.raceDate);
    const workouts = goal.workouts || [];

    // Group by Week
    const weeks: Record<string, any[]> = {};
    workouts.forEach((w: any) => {
        const monday = startOfWeek(new Date(w.scheduledDate), { weekStartsOn: 1 }).toISOString();
        if (!weeks[monday]) weeks[monday] = [];
        weeks[monday].push(w);
    });

    const sortedWeeks = Object.keys(weeks).sort();

    const handleEdit = (workout: any) => {
        setEditingWorkout(workout);
        setCreateDate(undefined);
        setIsEditModalOpen(true);
    };

    const handleCreate = (date: Date) => {
        setEditingWorkout(null);
        setCreateDate(date);
        setIsEditModalOpen(true);
    };

    return (
        <div className="min-h-screen bg-background p-4 md:p-8">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="text-gray-400 hover:text-white transition-colors">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-white">{goal.name} Plan</h1>
                        <p className="text-gray-400 text-sm flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Race: {format(raceDate, 'MMMM d, yyyy')}
                        </p>
                    </div>
                </div>

                {/* Weeks List */}
                <div className="space-y-6">
                    {sortedWeeks.map((weekStartIso, index) => {
                        const weekStart = new Date(weekStartIso);
                        const weekEnd = addDays(weekStart, 6);

                        const weeksUntilRace = differenceInWeeks(raceDate, weekStart);
                        const phase = getPhase(weeksUntilRace);

                        const weekWorkouts = weeks[weekStartIso].sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());

                        // Calculate Mileage
                        const weeklyMileage = weekWorkouts.reduce((sum: number, w: any) => {
                            if (RUN_TYPES.includes(w.workoutType) && w.targetDistance > 0) {
                                return sum + w.targetDistance;
                            }
                            return sum;
                        }, 0);

                        return (
                            <div key={weekStartIso} className="glass-card overflow-hidden">
                                {/* Week Header */}
                                <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
                                    <div className="flex items-center gap-3">
                                        <div className="flex flex-col">
                                            <span className="text-white font-semibold">Week {index + 1}</span>
                                            <span className="text-xs text-gray-400">
                                                {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d')}
                                            </span>
                                        </div>
                                        <div className="px-2 py-1 bg-white/5 rounded text-xs text-gray-300 border border-white/10">
                                            {(weeklyMileage / 1000).toFixed(1)} km
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-1 rounded text-xs font-bold border ${phase.color} mr-2`}>
                                            {phase.name}
                                        </span>
                                        <button
                                            onClick={() => handleCreate(weekStart)}
                                            className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white transition"
                                            title="Add Workout"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Workouts */}
                                <div className="divide-y divide-white/5">
                                    {weekWorkouts.map((workout: any) => {
                                        const wDate = new Date(workout.scheduledDate);
                                        const isTodayItem = isToday(wDate);
                                        const isDone = workout.isCompleted;

                                        const style = workoutStyles[workout.workoutType] || workoutStyles.EASY;
                                        const Icon = style.icon;

                                        return (
                                            <div
                                                key={workout.id}
                                                onClick={() => handleEdit(workout)}
                                                className={`p-4 flex items-center gap-4 hover:bg-white/5 transition-colors cursor-pointer ${isTodayItem ? 'bg-accent-orange/10' : ''}`}
                                            >
                                                <div className="flex flex-col items-center w-12 text-center">
                                                    <span className="text-xs text-gray-500 uppercase">{format(wDate, 'EEE')}</span>
                                                    <span className={`text-lg font-bold ${isTodayItem ? 'text-accent-orange' : 'text-gray-300'}`}>
                                                        {format(wDate, 'd')}
                                                    </span>
                                                </div>

                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-white/5 ${style.color}`}>
                                                    <Icon className="w-5 h-5" />
                                                </div>

                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className={`font-medium ${isDone ? 'text-gray-500 line-through' : 'text-white'}`}>
                                                            {style.label}
                                                        </h4>
                                                        {workout.targetDistance > 0 && (
                                                            <span className="text-sm text-gray-400">
                                                                {(workout.targetDistance / 1000).toFixed(1)} km
                                                            </span>
                                                        )}
                                                        {/* Duration for non-distance */}
                                                        {workout.targetDistance === 0 && workout.targetDuration > 0 && (
                                                            <span className="text-sm text-gray-400">
                                                                {Math.round(workout.targetDuration / 60)} min
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-gray-500 line-clamp-1">{workout.description}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <EditWorkoutModal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    refetch();
                }}
                workout={editingWorkout}
                defaultDate={createDate}
                goalId={goal.id}
            />
        </div>
    );
}
