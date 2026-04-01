import { useMemo, memo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, Eye, EyeOff } from 'lucide-react';
import { format, startOfWeek } from 'date-fns';
import {
    DndContext,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import { PlanWeek } from '@/app/plan/components/PlanWeek';
import { ErrorBoundary, Footer } from '@/components';
import { type WorkoutWithLinkedActivity, type PlanResponse, type ActivityListItem } from '@/lib/types';

interface PlanViewProps {
    data: PlanResponse | undefined;
    isLoading: boolean;
    showUnlinked: boolean;
    setShowUnlinked: (_show: boolean) => void;
    sensors: ReturnType<typeof useSensors>;
    handleDragEnd: (_event: DragEndEvent) => void;
    handleEdit: (_workout: WorkoutWithLinkedActivity) => void;
    handleComplete: (_workout: WorkoutWithLinkedActivity, _e: React.MouseEvent) => void;
    handleCreate: (_date: Date) => void;
    handleActivityClick: (_activity: ActivityListItem, _e: React.MouseEvent) => void;
    showHeader?: boolean;
}

function PlanViewComponent({
    data,
    isLoading,
    showUnlinked,
    setShowUnlinked,
    sensors,
    handleDragEnd,
    handleEdit,
    handleComplete,
    handleCreate,
    handleActivityClick,
    showHeader = true,
}: PlanViewProps) {
    const router = useRouter();

    const { goal, weeks, sortedWeeks, raceDate } = useMemo(() => {
        if (!data?.goal) return { goal: null, weeks: {}, sortedWeeks: [], raceDate: new Date() };

        const goal = data.goal;
        const raceDateObj = new Date(goal.raceDate);
        const raceDate = !isNaN(raceDateObj.getTime()) ? raceDateObj : new Date();
        const workouts = goal.workouts || [];
        const weeks: Record<string, WorkoutWithLinkedActivity[]> = {};

        workouts.forEach((w) => {
            const d = new Date(w.scheduledDate);
            if (isNaN(d.getTime())) return;
            try {
                const monday = startOfWeek(d, { weekStartsOn: 1 }).toISOString();
                if (!weeks[monday]) weeks[monday] = [];
                weeks[monday].push(w);
            } catch {
                console.warn('Invalid workout date:', w);
            }
        });

        const sortedWeeks = Object.keys(weeks).sort().filter(weekStartIso => {
            const weekStart = new Date(weekStartIso);
            if (isNaN(weekStart.getTime())) return false;

            if (goal.planStartDate) {
                const planStartObj = new Date(goal.planStartDate);
                if (!isNaN(planStartObj.getTime())) {
                    const planStart = startOfWeek(planStartObj, { weekStartsOn: 1 });
                    if (weekStart < planStart) return false;
                }
            }

            if (!isNaN(raceDate.getTime())) {
                const raceWeekStart = startOfWeek(raceDate, { weekStartsOn: 1 });
                if (weekStart > raceWeekStart) return false;
            }

            return true;
        });

        return { goal, weeks, sortedWeeks, raceDate };
    }, [data]);

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading plan...</div>;
    }

    if (!goal) {
        return (
            <div className="min-h-screen p-8 flex flex-col items-center justify-center text-center">
                <h1 className="text-2xl text-foreground font-bold mb-4">No Active Plan</h1>
                <p className="text-foreground-muted mb-6">You don&apos;t have an active training goal.</p>
                <button onClick={() => router.push('/onboarding?step=3')} className="btn-primary">Create Goal</button>
            </div>
        );
    }

    return (
        <ErrorBoundary componentName="Training Plan" showRetry>
            <div className="min-h-screen bg-background p-4 md:p-8">
                <div className="max-w-4xl mx-auto space-y-8">
                    {/* Header */}
                    {showHeader && (
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <button onClick={() => router.back()} className="text-foreground-muted hover:text-foreground transition-colors">
                                    <ArrowLeft className="w-6 h-6" />
                                </button>
                                <div>
                                    <h1 className="text-2xl font-bold text-foreground">{goal.name} Plan</h1>
                                    <p className="text-foreground-muted text-sm flex items-center gap-2">
                                        <Calendar className="w-4 h-4" />
                                        Race: {format(raceDate, 'MMMM d, yyyy')}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowUnlinked(!showUnlinked)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${showUnlinked
                                    ? 'bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30'
                                    : 'bg-surface text-foreground-muted hover:text-foreground border border-glass-border'
                                    }`}
                            >
                                {showUnlinked ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                {showUnlinked ? 'Unlinked On' : 'Show Unlinked'}
                            </button>
                        </div>
                    )}

                    {!showHeader && (
                        <div className="flex items-center justify-between pt-4">
                            <div>
                                <h1 className="text-xl font-bold text-foreground">{goal.name} Plan</h1>
                                <p className="text-foreground-muted text-xs flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    Race: {format(raceDate, 'MMM d, yyyy')}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowUnlinked(!showUnlinked)}
                                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${showUnlinked
                                    ? 'bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30'
                                    : 'bg-surface text-foreground-muted hover:text-foreground border border-glass-border'
                                    }`}
                            >
                                {showUnlinked ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                            </button>
                        </div>
                    )}

                    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                        {/* Weeks List */}
                        <div className="space-y-6">
                            {sortedWeeks.map((weekStartIso, index) => (
                                <PlanWeek
                                    key={weekStartIso}
                                    weekStartIso={weekStartIso}
                                    weekWorkouts={weeks[weekStartIso]}
                                    weekIndex={index}
                                    raceDate={raceDate}
                                    handleCreate={handleCreate}
                                    handleEdit={handleEdit}
                                    handleComplete={handleComplete}
                                    handleActivityClick={handleActivityClick}
                                    showUnlinked={showUnlinked}
                                    unlinkedActivities={data?.unlinkedActivities}
                                />
                            ))}
                        </div>
                    </DndContext>
                </div>

                {showHeader && <Footer />}
            </div>
        </ErrorBoundary>
    );
}

export const PlanView = memo(PlanViewComponent);
export default PlanView;
