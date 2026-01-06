'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, Flag, Activity, Clock, Zap, Bike, Mountain, Play } from 'lucide-react';
import { format, startOfWeek, endOfWeek, isToday, isPast, differenceInWeeks, addDays } from 'date-fns';
import { useSession } from 'next-auth/react';

const workoutStyles: Record<string, { color: string, icon: any, label: string }> = {
    EASY: { color: 'text-green-400', icon: Activity, label: 'Easy Run' },
    LONG_RUN: { color: 'text-blue-400', icon: Mountain, label: 'Long Run' },
    TEMPO: { color: 'text-yellow-400', icon: Zap, label: 'Tempo' },
    INTERVALS: { color: 'text-red-400', icon: Zap, label: 'Intervals' },
    RECOVERY: { color: 'text-teal-400', icon: Activity, label: 'Recovery' },
    REST: { color: 'text-gray-500', icon: Clock, label: 'Rest Day' },
    FACE: { color: 'text-purple-400', icon: Flag, label: 'Race' },
};

function getPhase(weeksUntilRace: number) {
    if (weeksUntilRace <= 2) return { name: 'TAPER', color: 'text-teal-400 border-teal-500/30 bg-teal-500/10' };
    if (weeksUntilRace <= 6) return { name: 'PEAK', color: 'text-purple-400 border-purple-500/30 bg-purple-500/10' };
    if (weeksUntilRace <= 10) return { name: 'BUILD', color: 'text-orange-400 border-orange-500/30 bg-orange-500/10' };
    return { name: 'BASE', color: 'text-blue-400 border-blue-500/30 bg-blue-500/10' };
}

export default function PlanPage() {
    const router = useRouter();
    const { status } = useSession();

    const { data, isLoading } = useQuery({
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

                        // Calculate Phase
                        const weeksUntilRace = differenceInWeeks(raceDate, weekStart);
                        // Logic from generateTrainingPlan: weeksUntilRace = weeksAvailable - week + 1
                        // Here we just use raw diff.
                        const phase = getPhase(weeksUntilRace);

                        const weekWorkouts = weeks[weekStartIso].sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());

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
                                    </div>
                                    <span className={`px-2 py-1 rounded text-xs font-bold border ${phase.color}`}>
                                        {phase.name} PHASE
                                    </span>
                                </div>

                                {/* Workouts */}
                                <div className="divide-y divide-white/5">
                                    {weekWorkouts.map((workout: any) => {
                                        const wDate = new Date(workout.scheduledDate);
                                        const isTodayItem = isToday(wDate);
                                        const isDone = workout.isCompleted || (isPast(wDate) && !isTodayItem); // Simplistic 'done' logic for UI visualization

                                        const style = workoutStyles[workout.workoutType] || workoutStyles.EASY;
                                        const Icon = style.icon;

                                        return (
                                            <div key={workout.id} className={`p-4 flex items-center gap-4 hover:bg-white/5 transition-colors ${isTodayItem ? 'bg-accent-orange/10' : ''}`}>
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
        </div>
    );
}
