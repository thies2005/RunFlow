'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, Flag, Activity, Clock, Zap, Bike, Mountain, Plus, Dumbbell, Settings, GripVertical } from 'lucide-react';
import { format, startOfWeek, addDays, isToday, isSameDay, differenceInWeeks } from 'date-fns';
import { useSession } from 'next-auth/react';
import { EditWorkoutModal } from '@/components';
import {
    DndContext,
    useSensor,
    useSensors,
    DragEndEvent,
    PointerSensor,
    TouchSensor,
    useDraggable,
    useDroppable,
} from '@dnd-kit/core';

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

// --- Draggable Workout Component ---
function DraggableWorkout({ workout, isTodayItem, onClick }: { workout: any; isTodayItem: boolean; onClick: () => void }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: workout.id,
        data: { workout },
    });

    const style = workoutStyles[workout.workoutType] || workoutStyles.EASY;
    const Icon = style.icon;

    const dragStyle = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 50,
        opacity: 0.9,
    } : undefined;

    if (isDragging) {
        return (
            <div ref={setNodeRef} style={dragStyle} className="bg-gray-800 p-4 rounded-lg shadow-xl border border-white/20 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-white/5 ${style.color}`}>
                    <Icon className="w-5 h-5" />
                </div>
                <div>
                    <h4 className="font-medium text-white">{style.label}</h4>
                </div>
            </div>
        )
    }

    return (
        <div
            ref={setNodeRef}
            style={dragStyle}
            className={`group p-3 rounded-lg flex items-center gap-3 hover:bg-white/5 transition-colors border border-transparent ${isDragging ? 'opacity-0' : ''} ${isTodayItem ? 'bg-accent-orange/5 border-accent-orange/20' : 'bg-white/5'}`}
        >
            <div className="cursor-grab text-gray-600 hover:text-white" {...listeners} {...attributes}>
                <GripVertical className="w-4 h-4" />
            </div>

            <div
                className={`w-8 h-8 rounded-full flex items-center justify-center bg-white/5 ${style.color} cursor-pointer`}
                onClick={onClick}
            >
                <Icon className="w-4 h-4" />
            </div>

            <div className="flex-1 cursor-pointer min-w-0" onClick={onClick}>
                <div className="flex items-center justify-between">
                    <h4 className={`text-sm font-medium truncate ${workout.isCompleted ? 'text-gray-500 line-through' : 'text-white'}`}>
                        {style.label}
                    </h4>
                    <div className="flex items-center gap-2">
                        {workout.targetDistance > 0 && (
                            <span className="text-xs text-gray-400 whitespace-nowrap">
                                {(workout.targetDistance / 1000).toFixed(1)}k
                            </span>
                        )}
                        <Settings className="w-3 h-3 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                </div>
                <p className="text-xs text-gray-500 truncate">{workout.description}</p>
            </div>
        </div>
    );
}

// --- Droppable Day Component ---
function DroppableDay({ date, children, isTodayItem, onAdd }: { date: Date; children: React.ReactNode; isTodayItem: boolean; onAdd: () => void }) {
    const dateStr = format(date, 'yyyy-MM-dd');
    const { setNodeRef, isOver } = useDroppable({
        id: `day-${dateStr}`,
        data: { date: dateStr },
    });

    return (
        <div
            ref={setNodeRef}
            className={`flex gap-2 p-2 rounded-lg min-h-[80px] transition-colors border ${isOver ? 'bg-white/10 border-accent-orange/50' : 'border-transparent hover:bg-white/5'} ${isTodayItem ? 'bg-accent-orange/5' : ''}`}
        >
            {/* Date Column */}
            <div className="flex flex-col items-center w-12 pt-2 shrink-0">
                <span className="text-[10px] text-gray-500 uppercase">{format(date, 'EEE')}</span>
                <span className={`text-lg font-bold ${isTodayItem ? 'text-accent-orange' : 'text-gray-300'}`}>
                    {format(date, 'd')}
                </span>
                <button
                    onClick={onAdd}
                    className="mt-2 text-gray-600 hover:text-white transition-colors"
                >
                    <Plus className="w-4 h-4" />
                </button>
            </div>

            {/* Workouts Column */}
            <div className="flex-1 space-y-2">
                {children}
                {/* Empty State Placeholder (only if no children) */}
                {Array.isArray(children) && children.length === 0 && (
                    <div className="h-full flex items-center justify-center border border-dashed border-white/10 rounded-lg text-xs text-gray-600">
                        Rest Day
                    </div>
                )}
            </div>
        </div>
    );
}


export default function PlanPage() {
    const router = useRouter();
    const { status } = useSession();
    const queryClient = useQueryClient();

    // Edit State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingWorkout, setEditingWorkout] = useState<any>(null);
    const [createDate, setCreateDate] = useState<Date | undefined>(undefined);

    // DnD Sensors
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    );

    // Reorder mutation
    const reorderMutation = useMutation({
        mutationFn: async ({ workoutId, newDate }: { workoutId: string; newDate: string }) => {
            const res = await fetch('/api/workouts/reorder', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ workoutId, newDate }),
            });
            if (!res.ok) throw new Error('Failed to reorder');
            return res.json();
        },
        onSuccess: () => {
            // Optimistic update handled by invalidation for now
            queryClient.invalidateQueries({ queryKey: ['plan'] });
            queryClient.invalidateQueries({ queryKey: ['goals'] });
        },
    });

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['plan'],
        queryFn: async () => (await fetch('/api/plan')).json(),
        enabled: status === 'authenticated'
    });

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active) {
            const workoutId = active.id as string;
            const overId = over.id as string;

            if (overId.startsWith('day-')) {
                const newDate = overId.replace('day-', '');
                const currentWorkout = active.data.current?.workout;

                // Only mutate if date actually changed
                if (currentWorkout && !isSameDay(new Date(currentWorkout.scheduledDate), new Date(newDate))) {
                    reorderMutation.mutate({ workoutId, newDate });
                }
            }
        }
    };

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

    // Determine start/end of the plan to render
    // We should render weeks starting from the plan start or today-ish
    // But sticking to the existing logic: render weeks connected to workouts
    // PLUS make sure we capture the current week if not present?
    // Let's iterate through workouts to find min/max, or just map them.
    // To ensure "Empty" weeks are shown properly (if gaps), we might need robust logic.
    // For now, simpler: Group workouts by week start. 
    // And for each week, we iterate 7 days.

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

                <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                    {/* Weeks List */}
                    <div className="space-y-6">
                        {sortedWeeks.map((weekStartIso, index) => {
                            const weekStart = new Date(weekStartIso);
                            const weekEnd = addDays(weekStart, 6);
                            const weeksUntilRace = differenceInWeeks(raceDate, weekStart);
                            const phase = getPhase(weeksUntilRace);
                            const weekWorkouts = weeks[weekStartIso];

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
                                    <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5 sticky top-0 z-10 backdrop-blur-md">
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
                                        <div>
                                            <span className={`px-2 py-1 rounded text-xs font-bold border ${phase.color}`}>
                                                {phase.name}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Days Grid (List View) */}
                                    <div className="p-2 space-y-1">
                                        {Array.from({ length: 7 }).map((_, i) => {
                                            const dayDate = addDays(weekStart, i);
                                            const isTodayItem = isToday(dayDate);
                                            const dayWorkouts = weekWorkouts.filter((w: any) => isSameDay(new Date(w.scheduledDate), dayDate));

                                            return (
                                                <DroppableDay
                                                    key={dayDate.toISOString()}
                                                    date={dayDate}
                                                    isTodayItem={isTodayItem}
                                                    onAdd={() => handleCreate(dayDate)}
                                                >
                                                    {dayWorkouts.map((workout: any) => (
                                                        <DraggableWorkout
                                                            key={workout.id}
                                                            workout={workout}
                                                            isTodayItem={isTodayItem}
                                                            onClick={() => handleEdit(workout)}
                                                        />
                                                    ))}
                                                </DroppableDay>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </DndContext>
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
