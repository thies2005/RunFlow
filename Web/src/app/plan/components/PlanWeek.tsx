import { memo } from 'react';
import { format, addDays, isToday, isSameDay, differenceInWeeks, isBefore, startOfWeek } from 'date-fns';
import { DraggableWorkout } from '@/app/plan/components/DraggableWorkout';
import { DroppableDay } from '@/app/plan/components/DroppableDay';
import { getPhase, formatDuration, RUN_TYPES } from '@/lib/plan/utils';
import { isRunningActivity, isCrossTrainingActivity, type WorkoutWithLinkedActivity, type UnlinkedActivity, type ActivityListItem } from '@/lib/types';

interface PlanWeekProps {
    weekStartIso: string;
    weekWorkouts: WorkoutWithLinkedActivity[];
    weekIndex: number;
    raceDate: Date;
    taperWeeks?: number;
    peakWeeks?: number;
    buildWeeks?: number;
    handleCreate: (_date: Date) => void;
    handleEdit: (_workout: WorkoutWithLinkedActivity) => void;
    handleComplete: (_workout: WorkoutWithLinkedActivity, _e: React.MouseEvent) => void;
    handleActivityClick: (_activity: ActivityListItem, _e: React.MouseEvent) => void;
    showUnlinked: boolean;
    unlinkedActivities?: UnlinkedActivity[];
}

export const PlanWeek = memo(function PlanWeek({
    weekStartIso,
    weekWorkouts,
    weekIndex,
    raceDate,
    taperWeeks,
    peakWeeks,
    buildWeeks,
    handleCreate,
    handleEdit,
    handleComplete,
    handleActivityClick,
    showUnlinked,
    unlinkedActivities
}: PlanWeekProps) {
    const weekStart = new Date(weekStartIso);
    const weekEnd = addDays(weekStart, 6);
    const raceWeekStart = startOfWeek(raceDate, { weekStartsOn: 1 });
    const weeksUntilRace = differenceInWeeks(raceWeekStart, weekStart) + 1;
    const phase = getPhase(weeksUntilRace, { taperWeeks, peakWeeks, buildWeeks });
    const isPastOrCurrent = isBefore(weekStart, new Date());

    let plannedMileage = 0;
    let actualRunMileage = 0;
    let totalMovingTime = 0;
    let runTime = 0;
    let crossTime = 0;

    weekWorkouts.forEach((w) => {
        if (RUN_TYPES.includes(w.workoutType) && (w.targetDistance ?? 0) > 0) {
            plannedMileage += (w.targetDistance ?? 0);
        }

        if (w.linkedActivity) {
            const act = w.linkedActivity;
            totalMovingTime += act.movingTime;

            if (isRunningActivity(act.type)) {
                actualRunMileage += act.distance;
                runTime += act.movingTime;
            } else if (isCrossTrainingActivity(act.type)) {
                crossTime += act.movingTime;
            }
        }
    });

    const runTimePct = totalMovingTime > 0 ? Math.round((runTime / totalMovingTime) * 100) : 0;
    const crossTimePct = totalMovingTime > 0 ? Math.round((crossTime / totalMovingTime) * 100) : 0;

    return (
        <div className="glass-card overflow-hidden">
            {/* Week Header */}

            <div className="p-3 md:p-4 border-b border-glass-border flex flex-row items-center justify-between bg-background/95 backdrop-blur-md relative md:sticky md:top-0 z-10 gap-2">
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="flex flex-col min-w-fit">
                        <span className="text-foreground font-semibold text-sm md:text-base">Week {weekIndex + 1}</span>
                        <span className="text-[10px] md:text-xs text-foreground-muted whitespace-nowrap">
                            {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d')}
                        </span>
                    </div>

                    {isPastOrCurrent ? (
                        <div className="flex flex-col space-y-0.5 md:space-y-1 ml-1 md:ml-2 overflow-hidden">
                            <div className="flex flex-wrap items-center gap-1.5 md:gap-2 text-xs">
                                <span className="px-1.5 py-0.5 bg-green-500/10 text-green-400 rounded border border-green-500/20 whitespace-nowrap text-[10px] md:text-xs">
                                    {(actualRunMileage / 1000).toFixed(1)}k
                                </span>
                                <span className="text-foreground-muted text-[10px] whitespace-nowrap hidden xs:inline">
                                    / {(plannedMileage / 1000).toFixed(1)}k
                                </span>
                            </div>
                            <div className="hidden sm:flex items-center gap-2 text-xs text-foreground-muted">
                                <span>Time: {formatDuration(totalMovingTime)}</span>
                                {totalMovingTime > 0 && (
                                    <span className="text-foreground-muted text-[10px]">
                                        ({runTimePct}% Run / {crossTimePct}% Cross)
                                    </span>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="px-2 py-1 bg-surface rounded text-xs text-foreground-muted border border-glass-border">
                            {(plannedMileage / 1000).toFixed(1)} km planned
                        </div>
                    )}
                </div>
                <div>
                    <span className={`px-2 py-1 rounded text-xs font-bold border ${phase.color}`}>
                        {phase.name}
                    </span>
                </div>
            </div>



            {/* Days Grid */}
            <div className="p-2 pt-3 space-y-1">
                {Array.from({ length: 7 }).map((_, i) => {
                    const dayDate = addDays(weekStart, i);
                    const isTodayItem = isToday(dayDate);
                    const dayWorkouts = weekWorkouts.filter((w) => isSameDay(new Date(w.scheduledDate), dayDate));

                    return (
                        <DroppableDay
                            key={dayDate.toISOString()}
                            date={dayDate}
                            isTodayItem={isTodayItem}
                            onAdd={handleCreate}
                            id={isTodayItem ? 'plan-today-anchor' : undefined}
                        >
                            {dayWorkouts.map((workout) => (
                                <DraggableWorkout
                                    key={workout.id}
                                    workout={workout}
                                    isTodayItem={isTodayItem}
                                    onClick={handleEdit}
                                    onComplete={handleComplete}
                                    onActivityClick={handleActivityClick}
                                />
                            ))}

                            {/* Unlinked Activities */}
                            {showUnlinked && unlinkedActivities?.filter(a =>
                                isSameDay(new Date(a.startDate), dayDate)
                            ).map((activity) => (
                                <div
                                    key={activity.id}
                                    onClick={(e) => {
                                        handleActivityClick(activity, e);
                                    }}
                                    className="group p-3 rounded-lg flex items-center gap-3 transition-colors border border-dashed border-accent-cyan/40 bg-accent-cyan/5 cursor-pointer hover:bg-accent-cyan/10"
                                >
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-accent-cyan/20 text-accent-cyan">
                                        <span className="text-xs font-bold">+</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-medium text-accent-cyan truncate">
                                            {activity.name}
                                        </h4>
                                        <p className="text-xs text-foreground-muted">
                                            {(activity.distance / 1000).toFixed(1)}km •
                                            {Math.floor(activity.movingTime / 60)}min •
                                            <span className="text-accent-cyan">Unlinked</span>
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </DroppableDay>
                    );
                })}
            </div>
        </div >
    );
});
