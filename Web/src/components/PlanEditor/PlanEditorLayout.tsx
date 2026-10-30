'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Toolbar } from './Toolbar';
import { MiniCalendar } from '@/app/plan-advanced/[goalId]/components/Calendar/MiniCalendar';
import { InfiniteScroll } from '@/app/plan-advanced/[goalId]/components/Shared/InfiniteScroll';
import { WorkoutDetailPanel, type Workout } from './WorkoutDetailPanel';
import { WorkoutListPanel, type WeekData } from './WorkoutListPanel';
import { MassEditToolbar } from '@/app/plan-advanced/[goalId]/components/MassEdit/MassEditToolbar';
import { SelectionProvider } from '@/app/plan-advanced/[goalId]/components/MassEdit/SelectionOverlay';
import { PlanKeyboardShortcuts } from '@/app/plan-advanced/[goalId]/components/Shared/PlanKeyboardShortcuts';
import { EventsPanel } from '@/app/plan-advanced/[goalId]/components/MultiGoal/EventsPanel';
import { GoalTimeline } from './GoalTimeline';
import { AddSubGoalDialog } from '@/app/plan-advanced/[goalId]/components/MultiGoal/AddSubGoalDialog';
import { EditSubGoalDialog } from '@/app/plan-advanced/[goalId]/components/MultiGoal/EditSubGoalDialog';
import { usePlanMode } from '@/app/plan-advanced/[goalId]/hooks/usePlanMode';
import { useIsPremium } from '@/app/plan-advanced/[goalId]/hooks/useIsPremium';
import { GuidedTipCard } from '@/app/plan-advanced/[goalId]/components/AI/GuidedTipCard';
import { GuidedWeekSuggest } from '@/app/plan-advanced/[goalId]/components/AI/GuidedWeekSuggest';
import { AiSuggestionCard } from '@/app/plan-advanced/[goalId]/components/AI/AiSuggestionCard';
import { startOfWeek, addDays } from 'date-fns';
import { calculateWorkoutPlannedTss } from '@/lib/metrics/plannedTss';
import type { PlanPhase } from '@/app/plan-advanced/[goalId]/components/Editor/PhaseSelector';
import type { Goal } from '@/app/plan-advanced/[goalId]/components/Progression/types';
import type { PhaseBlock } from '@/lib/plans';

function estimateWorkoutTss(w: Workout): number {
    if (w.plannedTss && w.plannedTss > 0) return w.plannedTss;
    const est = calculateWorkoutPlannedTss(w as any);
    if (est && est > 0) return est;
    if (w.targetDuration && w.targetDuration > 0) {
        return Math.round((w.targetDuration / 3600) * 55);
    }
    if (w.targetDistance && w.targetDistance > 0) {
        return Math.round((w.targetDistance / 1000) * 4);
    }
    return 0;
}

export function detectEffectivePlanSport(params: {
    planName?: string;
    sport?: string | null;
    workouts?: Workout[];
}): 'CYCLING' | 'TRIATHLON' | 'RUN' {
    const nameLower = (params.planName || '').toLowerCase();
    const isCyclingKeyword =
        nameLower.includes('cycling') ||
        nameLower.includes('bike') ||
        nameLower.includes('mywhoosh') ||
        nameLower.includes('zwift') ||
        nameLower.includes('ftp') ||
        nameLower.includes('sweet spot');

    const workouts = params.workouts || [];
    let bikeCount = 0;
    let runCount = 0;
    let swimCount = 0;

    for (const w of workouts) {
        const type = (w.workoutType || '').toUpperCase();
        const sp = (w.sport || '').toUpperCase();
        if (sp === 'BIKE' || ['RIDE', 'LONG_RIDE', 'RIDE_INTERVALS'].includes(type)) {
            bikeCount++;
        } else if (sp === 'RUN' || ['EASY', 'LONG_RUN', 'TEMPO', 'INTERVALS', 'FARTLEK', 'REPETITIONS', 'RECOVERY'].includes(type)) {
            runCount++;
        } else if (sp === 'SWIM' || ['SWIM', 'OPEN_WATER_SWIM', 'SWIM_DRILL'].includes(type)) {
            swimCount++;
        }
    }

    if (bikeCount > 0 && runCount === 0 && swimCount === 0) {
        return 'CYCLING';
    }

    if (isCyclingKeyword && swimCount === 0 && runCount === 0) {
        return 'CYCLING';
    }

    if (params.sport === 'TRIATHLON') {
        return 'TRIATHLON';
    }

    return 'RUN';
}

const AnalysisView = lazy(() =>
    import('./AnalysisView').then((mod) => ({ default: mod.AnalysisView }))
);

const AiChatPanel = lazy(() =>
    import('@/app/plan-advanced/[goalId]/components/AI/AiChatPanel').then((mod) => ({ default: mod.AiChatPanel }))
);

const CsvImportDialog = lazy(() =>
    import('@/app/plan-advanced/components/CsvImportExport').then((mod) => ({ default: mod.CsvImportDialog }))
);

const ZwoImportDialog = lazy(() =>
    import('@/app/plan-advanced/components/CsvImportExport').then((mod) => ({ default: mod.ZwoImportDialog }))
);

const CsvExportDialog = lazy(() =>
    import('@/app/plan-advanced/components/CsvImportExport').then((mod) => ({ default: mod.CsvExportDialog }))
);

export interface PlanEditorLayoutProps {
    goalId: string;
    planName: string;
    workouts: Workout[];
    raceDate?: Date | null;
    raceType?: string | null;
    sport?: string | null;
    goals?: Goal[];
    planStartDate?: Date | null;
    planEndDate?: Date | null;
    currentVdot?: number | null;
    phaseBlocks?: PhaseBlock[];
}

function EditorContent({
    goalId,
    planName,
    workouts,
    raceDate,
    raceType,
    sport,
    goals,
    planStartDate,
    planEndDate,
    currentVdot,
    phaseBlocks = [],
}: PlanEditorLayoutProps) {
    const queryClient = useQueryClient();
    const [calendarOpen, setCalendarOpen] = useState(true);
    const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
    const [addSubGoalOpen, setAddSubGoalOpen] = useState(false);
    const [editingSubGoal, setEditingSubGoal] = useState<Goal | null>(null);
    const [removingSubGoalId, setRemovingSubGoalId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'calendar' | 'analysis'>('calendar');
    const [chatOpen, setChatOpen] = useState(false);
    const [dismissedGuidedTips, setDismissedGuidedTips] = useState<Set<string>>(new Set());
    const [suggestWeekIndex, setSuggestWeekIndex] = useState<number | null>(null);
    const [dismissedAiSuggestions, setDismissedAiSuggestions] = useState<Set<string>>(new Set());
    const [csvImportOpen, setCsvImportOpen] = useState(false);
    const [zwoImportOpen, setZwoImportOpen] = useState(false);
    const [csvExportOpen, setCsvExportOpen] = useState(false);
    const [copiedWeekStart, setCopiedWeekStart] = useState<string | null>(null);
    const [currentPhaseBlocks, setCurrentPhaseBlocks] = useState<PhaseBlock[]>(phaseBlocks);
    const mainScrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (phaseBlocks && phaseBlocks.length > 0) {
            setCurrentPhaseBlocks(phaseBlocks);
        }
    }, [phaseBlocks]);

    const { mode, setMode, isGuided, isAiAssisted } = usePlanMode(goalId);
    const { isPremium } = useIsPremium();

    const handleViewModeChange = useCallback(
        (vm: 'calendar' | 'analysis') => {
            setViewMode(vm);
        },
        []
    );

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const importParam = new URLSearchParams(window.location.search).get('import');
            if (importParam === 'ai-image') {
                setChatOpen(true);
                return;
            }
            if (importParam === 'csv') {
                setCsvImportOpen(true);
            } else if (importParam === 'zwo') {
                setZwoImportOpen(true);
            }
        }
        setChatOpen(isPremium && mode === 'AI_ASSISTED');
    }, [mode, isPremium]);

    const isNoRace = raceType === null || raceType === undefined;
    const parentSport = sport === 'TRIATHLON' ? 'TRIATHLON' : 'RUN';

    const weeks = useMemo<WeekData[]>(() => {
        const weekMap = new Map<string, Workout[]>();
        for (const w of workouts) {
            const d = new Date(w.scheduledDate);
            if (isNaN(d.getTime())) continue;
            const monday = startOfWeek(d, { weekStartsOn: 1 });
            const key = monday.toISOString().split('T')[0];
            if (!weekMap.has(key)) weekMap.set(key, []);
            weekMap.get(key)!.push(w);
        }
        return Array.from(weekMap.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([_key, weekWorkouts], index) => {
                const monday = new Date(weekWorkouts[0].scheduledDate);
                const weekStart = startOfWeek(monday, { weekStartsOn: 1 });
                const weekEnd = addDays(weekStart, 6);
                return { weekStart, weekEnd, weekNumber: index + 1, workouts: weekWorkouts };
            });
    }, [workouts]);

    const handleDayClick = useCallback((date: Date) => {
        const monday = startOfWeek(date, { weekStartsOn: 1 });
        const weekKey = monday.toISOString().split('T')[0];
        const el = document.getElementById(`week-${weekKey}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, []);

    const handleWorkoutClick = useCallback((workout: Workout) => {
        setSelectedWorkout(workout);
    }, []);

    const handleClosePanel = useCallback(() => {
        setSelectedWorkout(null);
    }, []);

    const handleWorkoutUpdate = useCallback(
        (updatedWorkout: Workout) => {
            setSelectedWorkout(updatedWorkout);
            queryClient.invalidateQueries({ queryKey: ['plan-advanced', goalId] });
        },
        [goalId, queryClient]
    );

    const handlePhaseChange = useCallback(
        (_phase: PlanPhase) => {
            queryClient.invalidateQueries({ queryKey: ['plan-advanced', goalId] });
        },
        [goalId, queryClient]
    );

    const handleUpdatePhaseBlocks = useCallback(
        async (updatedBlocks: PhaseBlock[]) => {
            setCurrentPhaseBlocks(updatedBlocks);
            try {
                // Update goal phaseBlocks via PATCH
                await fetch(`/api/plan-advanced/${goalId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phaseBlocks: updatedBlocks }),
                });
                toast.success('Phase blocks updated');
                queryClient.invalidateQueries({ queryKey: ['plan-advanced', goalId] });
            } catch {
                toast.error('Failed to save phase blocks');
            }
        },
        [goalId, queryClient]
    );

    const getGuidedTip = useCallback(
        (week: WeekData) => {
            const tipKey = `week${week.weekNumber}`;
            if (dismissedGuidedTips.has(tipKey)) return null;
            if (week.workouts.length > 0) return null;

            const phase = (week.workouts[0]?.phase as PlanPhase) || 'BASE';
            const phaseTips: Record<string, { title: string; body: string }> = {
                BASE: {
                    title: 'Build your first base week',
                    body: 'For a BASE week, include 3-4 easy runs building aerobic endurance, 1 long run starting at ~30% of peak distance, and optionally 1 light stride session.',
                },
                BUILD: {
                    title: 'Add structured workouts',
                    body: 'BUILD weeks should include 1 interval session, 1 tempo run, and a progressively longer long run. Keep easy runs for recovery.',
                },
                PEAK: {
                    title: 'Peak training intensity',
                    body: 'PEAK weeks are the highest volume and intensity. Include 2 quality sessions (intervals + tempo), a long run near peak distance, and ensure adequate recovery.',
                },
                TAPER: {
                    title: 'Reduce volume for recovery',
                    body: 'Taper reduces volume by 20-30% while maintaining intensity. This helps your body absorb training adaptations before race day.',
                },
            };

            const tip = phaseTips[phase] || phaseTips.BASE;
            return { tipKey, ...tip };
        },
        [dismissedGuidedTips]
    );

    const getAiSuggestions = useCallback(
        (week: WeekData, index: number): Array<{ id: string; type: 'warning' | 'info'; title: string; body: string }> => {
            const suggestions: Array<{ id: string; type: 'warning' | 'info'; title: string; body: string }> = [];
            const weekDist = week.workouts.reduce((sum, w) => sum + (w.targetDistance || 0), 0);

            if (weekDist > 0 && index > 0) {
                const prevWeek = weeks[index - 1];
                if (prevWeek) {
                    const prevDist = prevWeek.workouts.reduce((sum, w) => sum + (w.targetDistance || 0), 0);
                    if (prevDist > 0) {
                        const jumpPct = ((weekDist - prevDist) / prevDist) * 100;
                        if (jumpPct > 10) {
                            suggestions.push({
                                id: `vol_jump_${week.weekNumber}`,
                                type: 'warning',
                                title: `Volume Jump: +${jumpPct.toFixed(0)}%`,
                                body: `Week ${week.weekNumber} volume (${(weekDist / 1000).toFixed(1)}km) is ${jumpPct.toFixed(0)}% higher than week ${prevWeek.weekNumber} (${(prevDist / 1000).toFixed(1)}km). Recommended max: 10% weekly increase.`,
                            });
                        }
                    }
                }
            }

            const hardDays = week.workouts.filter((w) =>
                ['INTERVALS', 'REPETITIONS', 'TEMPO', 'FARTLEK'].includes(w.workoutType)
            );
            if (hardDays.length >= 3) {
                suggestions.push({
                    id: `back2back_${week.weekNumber}`,
                    type: 'warning',
                    title: 'Too Many Hard Days',
                    body: `This week has ${hardDays.length} hard workouts. Consider replacing one with an easy run or rest day to improve recovery.`,
                });
            }

            return suggestions.filter((s) => !dismissedAiSuggestions.has(s.id));
        },
        [weeks, dismissedAiSuggestions]
    );

    const renderWeek = useCallback(
        (week: WeekData, index: number) => {
            const weekKey = week.weekStart.toISOString().split('T')[0];

            return (
                <div key={weekKey} id={`week-${weekKey}`}>
                    {isGuided && getGuidedTip(week) && (
                        <GuidedTipCard
                            type="tip"
                            title={`Guided: ${getGuidedTip(week)!.title}`}
                            body={getGuidedTip(week)!.body}
                            actions={[
                                {
                                    label: 'Suggest Week',
                                    onClick: () => setSuggestWeekIndex(week.weekNumber),
                                },
                                {
                                    label: "Don't show again",
                                    onClick: () => {
                                        setDismissedGuidedTips((prev) => new Set([...prev, `week${week.weekNumber}`]));
                                    },
                                },
                            ]}
                            onDismiss={() => {
                                setDismissedGuidedTips((prev) => new Set([...prev, `week${week.weekNumber}`]));
                            }}
                        />
                    )}

                    {suggestWeekIndex === week.weekNumber && (
                        <GuidedWeekSuggest
                            goalId={goalId}
                            weekIndex={week.weekNumber}
                            weekStartDate={week.weekStart}
                            phase={(week.workouts[0]?.phase as PlanPhase) || 'BASE'}
                            vdot={currentVdot || 40}
                            onApply={() => setSuggestWeekIndex(null)}
                            onClose={() => setSuggestWeekIndex(null)}
                        />
                    )}

                    <WorkoutListPanel
                        week={week}
                        goalId={goalId}
                        onWorkoutClick={handleWorkoutClick}
                        onPhaseChange={handlePhaseChange}
                        copiedWeekStart={copiedWeekStart}
                        onCopyWeek={setCopiedWeekStart}
                    />

                    {isAiAssisted &&
                        getAiSuggestions(week, index).map((suggestion) => (
                            <AiSuggestionCard
                                key={suggestion.id}
                                type={suggestion.type}
                                title={suggestion.title}
                                body={suggestion.body}
                                applyAction={() => {
                                    toast.info('Suggestion applied. Adjust as needed.');
                                    setDismissedAiSuggestions((prev) => new Set([...prev, suggestion.id]));
                                }}
                                onDismiss={() => {
                                    setDismissedAiSuggestions((prev) => new Set([...prev, suggestion.id]));
                                }}
                            />
                        ))}
                </div>
            );
        },
        [
            goalId,
            isGuided,
            isAiAssisted,
            getGuidedTip,
            getAiSuggestions,
            suggestWeekIndex,
            handleWorkoutClick,
            handlePhaseChange,
            currentVdot,
            copiedWeekStart,
        ]
    );

    const handleOperationComplete = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ['plan-advanced', goalId] });
    }, [goalId, queryClient]);

    const handleAddSubGoal = useCallback(() => {
        setAddSubGoalOpen(true);
    }, []);

    const handleEditSubGoal = useCallback(
        (id: string) => {
            const goal = goals?.find((g) => g.id === id);
            if (goal) setEditingSubGoal(goal);
        },
        [goals]
    );

    const handleRemoveSubGoal = useCallback(
        (id: string) => {
            setRemovingSubGoalId(id);
            const goal = goals?.find((g) => g.id === id);
            if (goal) setEditingSubGoal(goal);
        },
        [goals]
    );

    const handleSubGoalCreated = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ['plan-advanced', goalId] });
    }, [goalId, queryClient]);

    const handleSubGoalUpdated = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ['plan-advanced', goalId] });
        setEditingSubGoal(null);
        setRemovingSubGoalId(null);
    }, [goalId, queryClient]);

    const handleGoalMarkerClick = useCallback(
        (id: string) => {
            const goal = goals?.find((g) => g.id === id);
            if (goal) setEditingSubGoal(goal);
        },
        [goals]
    );

    const timelineStart =
        planStartDate || (raceDate ? new Date(raceDate.getTime() - 16 * 7 * 24 * 60 * 60 * 1000) : new Date());
    const timelineEnd = planEndDate || raceDate || new Date();
    const currentWeek = useMemo(() => {
        if (!timelineStart) return 1;
        const now = new Date();
        const diffMs = now.getTime() - timelineStart.getTime();
        return Math.max(1, Math.ceil(diffMs / (7 * 24 * 60 * 60 * 1000)));
    }, [timelineStart]);

    const effectiveSport = useMemo(() => {
        return detectEffectivePlanSport({ planName, sport, workouts });
    }, [planName, sport, workouts]);

    const hasStrength = useMemo(() => {
        return workouts.some((w) => w.workoutType === 'STRENGTH' || w.sport === 'STRENGTH');
    }, [workouts]);

    const computeWeekEffort = useCallback((weekWorkouts: Workout[]) => {
        let plannedTss = 0;
        let actualTss = 0;
        let plannedDurationSec = 0;
        let actualDurationSec = 0;

        for (const w of weekWorkouts) {
            if (w.workoutType === 'REST') continue;
            const wPlannedTss = w.plannedTss && w.plannedTss > 0 ? w.plannedTss : estimateWorkoutTss(w);
            const wPlannedDur = w.targetDuration || 0;
            plannedTss += Math.round(wPlannedTss);
            plannedDurationSec += wPlannedDur;

            if (w.isCompleted || w.linkedActivity) {
                const linkedTss = w.linkedActivity
                    ? (w.linkedActivity.bikeTss || w.linkedActivity.runningTss || w.linkedActivity.trimp || 0)
                    : 0;
                actualTss += linkedTss > 0 ? Math.round(linkedTss) : Math.round(wPlannedTss);
                actualDurationSec += (w.linkedActivity?.movingTime && w.linkedActivity.movingTime > 0)
                    ? w.linkedActivity.movingTime
                    : wPlannedDur;
            }
        }

        return {
            plannedTss,
            actualTss,
            plannedDurationSec,
            actualDurationSec,
        };
    }, []);

    const currentWeekEffort = useMemo(() => {
        const wk = weeks.find((w) => w.weekNumber === currentWeek) || weeks.find((w) => {
            const now = new Date();
            return now >= w.weekStart && now <= w.weekEnd;
        });
        let wkWorkouts: Workout[] = [];
        if (wk) {
            wkWorkouts = wk.workouts;
        } else {
            const wStart = new Date(timelineStart.getTime() + (currentWeek - 1) * 7 * 86400000);
            const wEnd = new Date(timelineStart.getTime() + currentWeek * 7 * 86400000);
            wkWorkouts = workouts.filter((w) => {
                const d = new Date(w.scheduledDate);
                return d >= wStart && d < wEnd;
            });
        }
        return computeWeekEffort(wkWorkouts);
    }, [weeks, workouts, currentWeek, timelineStart, computeWeekEffort]);

    const totalWeeks = Math.max(1, Math.ceil((timelineEnd.getTime() - timelineStart.getTime()) / (7 * 86400000)));
    const blockStartWeek = Math.floor((currentWeek - 1) / 4) * 4 + 1;
    const blockEndWeek = Math.min(totalWeeks, blockStartWeek + 3);

    const blockWeeksBreakdown = useMemo(() => {
        const list: Array<{ weekNumber: number; plannedTss: number; actualTss: number; isCurrentWeek: boolean }> = [];
        for (let wNum = blockStartWeek; wNum <= blockEndWeek; wNum++) {
            const wk = weeks.find((w) => w.weekNumber === wNum);
            let wkWorkouts: Workout[] = [];
            if (wk) {
                wkWorkouts = wk.workouts;
            } else {
                const wStart = new Date(timelineStart.getTime() + (wNum - 1) * 7 * 86400000);
                const wEnd = new Date(timelineStart.getTime() + wNum * 7 * 86400000);
                wkWorkouts = workouts.filter((w) => {
                    const d = new Date(w.scheduledDate);
                    return d >= wStart && d < wEnd;
                });
            }
            const effort = computeWeekEffort(wkWorkouts);
            list.push({
                weekNumber: wNum,
                plannedTss: effort.plannedTss,
                actualTss: effort.actualTss,
                isCurrentWeek: wNum === currentWeek,
            });
        }
        return list;
    }, [weeks, workouts, blockStartWeek, blockEndWeek, currentWeek, timelineStart, computeWeekEffort]);

    return (
        <div className="h-screen flex flex-col bg-background text-foreground">
            <Toolbar
                goalId={goalId}
                planName={planName}
                mode={mode}
                onModeChange={setMode}
                onImportCsv={() => setCsvImportOpen(true)}
                onImportZwo={() => setZwoImportOpen(true)}
                onExportCsv={() => setCsvExportOpen(true)}
                viewMode={viewMode}
                onViewModeChange={handleViewModeChange}
                onToggleChat={isPremium ? () => setChatOpen((prev) => !prev) : undefined}
                chatOpen={chatOpen}
                isPremium={isPremium}
                sport={effectiveSport === 'CYCLING' ? 'CYCLING' : sport}
                raceType={effectiveSport === 'CYCLING' ? (hasStrength ? 'Cycling & Strength' : 'Cycling') : raceType}
                raceDate={raceDate}
                currentVdot={currentVdot}
                workouts={workouts}
            />

            <EventsPanel
                goals={goals || []}
                onAddSubGoal={handleAddSubGoal}
                onEditSubGoal={handleEditSubGoal}
                onRemoveSubGoal={handleRemoveSubGoal}
            />

            {!isNoRace && (
                <GoalTimeline
                    goals={goals || []}
                    planStartDate={timelineStart}
                    planEndDate={timelineEnd}
                    currentWeek={currentWeek}
                    onMarkerClick={handleGoalMarkerClick}
                    phaseBlocks={currentPhaseBlocks}
                    onUpdatePhaseBlocks={handleUpdatePhaseBlocks}
                    currentWeekEffort={currentWeekEffort}
                    blockWeeksBreakdown={blockWeeksBreakdown}
                />
            )}

            <div className="flex-1 flex overflow-hidden">
                {viewMode === 'calendar' ? (
                    <>
                        {calendarOpen && (
                            <div className="w-64 border-r border-glass-border overflow-y-auto shrink-0">
                                <MiniCalendar workouts={workouts} raceDate={raceDate} onDayClick={handleDayClick} />
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto py-3" ref={mainScrollRef}>
                            <InfiniteScroll
                                items={weeks}
                                renderItem={renderWeek}
                                estimateSize={320}
                                className="h-full"
                            />
                            {weeks.length === 0 && (
                                <div className="flex items-center justify-center h-full text-foreground-muted text-sm">
                                    No workouts yet. Start by adding workouts or generating with the engine.
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <Suspense
                        fallback={
                            <div className="flex-1 flex items-center justify-center">
                                <div className="w-6 h-6 border-2 border-foreground/25 border-t-foreground rounded-full animate-spin" />
                            </div>
                        }
                    >
                        <AnalysisView
                            workouts={workouts}
                            goalId={goalId}
                            raceDate={raceDate}
                            raceType={raceType}
                            isNoRace={isNoRace}
                        />
                    </Suspense>
                )}

                {isPremium && (
                    <Suspense fallback={null}>
                        <AiChatPanel goalId={goalId} isOpen={chatOpen} onClose={() => setChatOpen(false)} />
                    </Suspense>
                )}

                {selectedWorkout && (
                    <WorkoutDetailPanel
                        workout={selectedWorkout}
                        goalId={goalId}
                        onClose={handleClosePanel}
                        onUpdate={handleWorkoutUpdate}
                    />
                )}
            </div>

            {viewMode === 'calendar' && (
                <MassEditToolbar goalId={goalId} onOperationComplete={handleOperationComplete} />
            )}

            <AddSubGoalDialog
                parentGoalId={goalId}
                parentSport={parentSport}
                isOpen={addSubGoalOpen}
                onClose={() => setAddSubGoalOpen(false)}
                onCreated={handleSubGoalCreated}
            />

            {editingSubGoal && (
                <EditSubGoalDialog
                    subGoal={editingSubGoal}
                    isOpen={true}
                    onClose={() => {
                        setEditingSubGoal(null);
                        setRemovingSubGoalId(null);
                    }}
                    onUpdated={handleSubGoalUpdated}
                />
            )}

            <PlanKeyboardShortcuts goalId={goalId} workouts={workouts} onClosePanel={handleClosePanel} />

            <Suspense fallback={null}>
                <CsvImportDialog
                    goalId={goalId}
                    isOpen={csvImportOpen}
                    onClose={() => setCsvImportOpen(false)}
                    onImported={() => {
                        setCsvImportOpen(false);
                        queryClient.invalidateQueries({ queryKey: ['plan-advanced', goalId] });
                    }}
                />
            </Suspense>

            <Suspense fallback={null}>
                <ZwoImportDialog
                    goalId={goalId}
                    isOpen={zwoImportOpen}
                    onClose={() => setZwoImportOpen(false)}
                    onImported={() => {
                        setZwoImportOpen(false);
                        queryClient.invalidateQueries({ queryKey: ['plan-advanced', goalId] });
                    }}
                />
            </Suspense>

            <Suspense fallback={null}>
                <CsvExportDialog goalId={goalId} isOpen={csvExportOpen} onClose={() => setCsvExportOpen(false)} />
            </Suspense>
        </div>
    );
}

export function PlanEditorLayout(props: PlanEditorLayoutProps) {
    return (
        <SelectionProvider workouts={props.workouts}>
            <EditorContent {...props} />
        </SelectionProvider>
    );
}

export default PlanEditorLayout;
