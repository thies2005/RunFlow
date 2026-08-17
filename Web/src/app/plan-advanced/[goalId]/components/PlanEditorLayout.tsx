'use client';

import { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PlanToolbar } from './Toolbar/PlanToolbar';
import { MiniCalendar } from './Calendar/MiniCalendar';
import { InfiniteScroll } from './Shared/InfiniteScroll';
import { WORKOUT_COLORS } from './Shared/WorkoutTypeColors';
import { WorkoutDetailPanel } from './Editor/WorkoutDetailPanel';
import { WorkoutListPanel } from './Editor/WorkoutListPanel';
import { MassEditToolbar } from './MassEdit/MassEditToolbar';
import { SelectionProvider, useSelection } from './MassEdit/SelectionOverlay';
import { PlanKeyboardShortcuts } from './Shared/PlanKeyboardShortcuts';
import { EventsPanel } from './MultiGoal/EventsPanel';
import { GoalTimeline } from './MultiGoal/GoalTimeline';
import { AddSubGoalDialog } from './MultiGoal/AddSubGoalDialog';
import { EditSubGoalDialog } from './MultiGoal/EditSubGoalDialog';
import { usePlanMode } from '../hooks/usePlanMode';
import { useIsPremium } from '../hooks/useIsPremium';
import { GuidedTipCard } from './AI/GuidedTipCard';
import { GuidedWeekSuggest } from './AI/GuidedWeekSuggest';
import { AiSuggestionCard } from './AI/AiSuggestionCard';
import { startOfWeek, addDays } from 'date-fns';
import type { PlanPhase } from './Editor/PhaseSelector';
import type { Workout } from './Editor/WorkoutDetailPanel';
import type { Goal } from './Progression/types';

const AnalysisView = lazy(() =>
    import('./Analysis/AnalysisView').then((mod) => ({ default: mod.AnalysisView }))
);

const AiChatPanel = lazy(() =>
    import('./AI/AiChatPanel').then((mod) => ({ default: mod.AiChatPanel }))
);

const CsvImportDialog = lazy(() =>
    import('../../components/CsvImportExport').then((mod) => ({ default: mod.CsvImportDialog }))
);

const CsvExportDialog = lazy(() =>
    import('../../components/CsvImportExport').then((mod) => ({ default: mod.CsvExportDialog }))
);

interface WeekData {
    weekStart: Date;
    weekEnd: Date;
    weekNumber: number;
    workouts: Workout[];
}

interface PlanEditorLayoutProps {
    goalId: string;
    planName: string;
    workouts: Workout[];
    raceDate?: Date | null;
    raceType?: string | null;
    goals?: Goal[];
    planStartDate?: Date | null;
    planEndDate?: Date | null;
    currentVdot?: number | null;
}

function EditorContent({ goalId, planName, workouts, raceDate, raceType, goals, planStartDate, planEndDate, currentVdot }: PlanEditorLayoutProps) {
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
    const [csvExportOpen, setCsvExportOpen] = useState(false);
    const mainScrollRef = useRef<HTMLDivElement>(null);

    const { mode, setMode, isGuided, isAiAssisted } = usePlanMode(goalId);
    const { isPremium } = useIsPremium();

    const handleViewModeChange = useCallback((vm: 'calendar' | 'analysis') => {
        if (vm === 'analysis') {
            if (isPremium) {
                setViewMode('analysis');
            } else {
                toast.info('Upgrade to premium to access AI plan analysis.');
            }
        } else {
            setViewMode('calendar');
        }
    }, [isPremium]);

    // Auto-toggle chat panel based on mode (premium only)
    useEffect(() => {
        setChatOpen(isPremium && mode === 'AI_ASSISTED');
    }, [mode, isPremium]);
    const isNoRace = raceType === null || raceType === undefined;

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
        [goalId, queryClient],
    );

    const handlePhaseChange = useCallback(
        (_phase: PlanPhase) => {
            queryClient.invalidateQueries({ queryKey: ['plan-advanced', goalId] });
        },
        [goalId, queryClient],
    );

    const getGuidedTip = useCallback((week: WeekData) => {
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
    }, [dismissedGuidedTips]);

    const getAiSuggestions = useCallback((week: WeekData, index: number): Array<{ id: string; type: 'warning' | 'info'; title: string; body: string }> => {
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

        const hardDays = week.workouts.filter((w) => ['INTERVALS', 'REPETITIONS', 'TEMPO', 'FARTLEK'].includes(w.workoutType));
        if (hardDays.length >= 3) {
            suggestions.push({
                id: `back2back_${week.weekNumber}`,
                type: 'warning',
                title: 'Too Many Hard Days',
                body: `This week has ${hardDays.length} hard workouts. Consider replacing one with an easy run or rest day to improve recovery.`,
            });
        }

        return suggestions.filter((s) => !dismissedAiSuggestions.has(s.id));
    }, [weeks, dismissedAiSuggestions]);

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
                    />

                    {isAiAssisted && getAiSuggestions(week, index).map((suggestion) => (
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
        [goalId, isGuided, isAiAssisted, getGuidedTip, getAiSuggestions, suggestWeekIndex, handleWorkoutClick, handlePhaseChange, currentVdot],
    );

    const handleOperationComplete = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ['plan-advanced', goalId] });
    }, [goalId, queryClient]);

    const handleAddSubGoal = useCallback(() => {
        setAddSubGoalOpen(true);
    }, []);

    const handleEditSubGoal = useCallback((id: string) => {
        const goal = goals?.find((g) => g.id === id);
        if (goal) setEditingSubGoal(goal);
    }, [goals]);

    const handleRemoveSubGoal = useCallback((id: string) => {
        setRemovingSubGoalId(id);
        const goal = goals?.find((g) => g.id === id);
        if (goal) setEditingSubGoal(goal);
    }, [goals]);

    const handleSubGoalCreated = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ['plan-advanced', goalId] });
    }, [goalId, queryClient]);

    const handleSubGoalUpdated = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ['plan-advanced', goalId] });
        setEditingSubGoal(null);
        setRemovingSubGoalId(null);
    }, [goalId, queryClient]);

    const handleGoalMarkerClick = useCallback((goalId: string) => {
        const goal = goals?.find((g) => g.id === goalId);
        if (goal) setEditingSubGoal(goal);
    }, [goals]);

    const timelineStart = planStartDate || (raceDate ? new Date(raceDate.getTime() - 16 * 7 * 24 * 60 * 60 * 1000) : new Date());
    const timelineEnd = planEndDate || raceDate || new Date();
    const currentWeek = useMemo(() => {
        if (!timelineStart) return 1;
        const now = new Date();
        const diffMs = now.getTime() - timelineStart.getTime();
        return Math.max(1, Math.ceil(diffMs / (7 * 24 * 60 * 60 * 1000)));
    }, [timelineStart]);

    return (
        <div className="h-screen flex flex-col bg-background text-foreground">
            <PlanToolbar
                goalId={goalId}
                planName={planName}
                mode={mode}
                onModeChange={setMode}
                onImportCsv={() => setCsvImportOpen(true)}
                onExportCsv={() => setCsvExportOpen(true)}
                viewMode={viewMode}
                onViewModeChange={handleViewModeChange}
                onToggleChat={isPremium ? () => setChatOpen((prev) => !prev) : undefined}
                chatOpen={chatOpen}
                isPremium={isPremium}
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
                                    No workouts yet. Start by adding workouts to your plan.
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <Suspense fallback={
                        <div className="flex-1 flex items-center justify-center">
                            <div className="w-6 h-6 border-2 border-foreground/25 border-t-foreground rounded-full animate-spin" />
                        </div>
                    }>
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
                        <AiChatPanel
                            goalId={goalId}
                            isOpen={chatOpen}
                            onClose={() => setChatOpen(false)}
                        />
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

            {viewMode === 'calendar' && <MassEditToolbar goalId={goalId} onOperationComplete={handleOperationComplete} />}

            <AddSubGoalDialog
                parentGoalId={goalId}
                parentSport="RUNNING"
                isOpen={addSubGoalOpen}
                onClose={() => setAddSubGoalOpen(false)}
                onCreated={handleSubGoalCreated}
            />

            {editingSubGoal && (
                <EditSubGoalDialog
                    subGoal={editingSubGoal}
                    isOpen={true}
                    onClose={() => { setEditingSubGoal(null); setRemovingSubGoalId(null); }}
                    onUpdated={handleSubGoalUpdated}
                />
            )}

            <PlanKeyboardShortcuts
                goalId={goalId}
                workouts={workouts}
                onClosePanel={handleClosePanel}
            />

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
                <CsvExportDialog
                    goalId={goalId}
                    isOpen={csvExportOpen}
                    onClose={() => setCsvExportOpen(false)}
                />
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
