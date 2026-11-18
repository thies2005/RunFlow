'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell } from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import { AppTopBar } from '@/components/layout/AppTopBar';
import { AddSupplementModal } from './AddSupplementModal';
import { HealthTrendContent } from './HealthTrendModal';
import { BodyCompositionTab } from './BodyCompositionTab';
import { WeeklyInsightsCard } from './WeeklyInsightsCard';
import NutritionAnalyticsView from './NutritionAnalyticsView';
import { NutritionGoalsModal } from './NutritionGoalsModal';
import { FoodScanResultView } from './FoodScanResultView';
import { NutritionLogHistoryView } from './NutritionLogHistoryView';
import { AddStackModal } from './AddStackModal';
import { SupplementStatsModal } from './SupplementStatsModal';
import { ReminderSettingsModal } from './ReminderSettingsModal';
import SupplementAnalyticsView from './SupplementAnalyticsView';
import type { Supplement, SupplementStack, SupplementLog, NutritionLog, FoodScanResult } from '@/lib/types/health';
import { getCurrentUtcDayKey, parseUtcDayKey } from '@/lib/health/dates';
import { NutritionSummary } from './health/NutritionSummary';
import { BodyMetricsCard } from './health/BodyMetricsCard';
import ReadinessCard from './health/ReadinessCard';
import { QuickActions } from './health/QuickActions';
import { MealSection } from './health/MealSection';
import { SupplementsSection } from './health/SupplementsSection';
import { SectionErrorCard, SectionLoadingCard } from './health/SectionStates';
import { AddFoodSheet, type AddFoodTab } from './health/AddFoodSheet';

type HealthTab = 'today' | 'trends' | 'insights';

const HEALTH_TABS: Array<{ id: HealthTab; label: string }> = [
    { id: 'today', label: 'Today' },
    { id: 'trends', label: 'Trends & Body' },
    { id: 'insights', label: 'Insights' },
];

interface HealthViewProps {
    showHeader?: boolean;
}

export default function HealthView({ showHeader = true }: HealthViewProps) {
    const { data: session } = useSession();
    const queryClient = useQueryClient();
    const [activeHealthTab, setActiveHealthTab] = useState<HealthTab>('today');
    const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isAddStackModalOpen, setIsAddStackModalOpen] = useState(false);
    const [supplementToEdit, setSupplementToEdit] = useState<Supplement | null>(null);
    const [stackToEdit, setStackToEdit] = useState<SupplementStack | null>(null);

    const [statsConfig, setStatsConfig] = useState<{ isOpen: boolean; targetId: string | null; targetType: 'supplement' | 'stack' | null; targetName: string }>({
        isOpen: false, targetId: null, targetType: null, targetName: '',
    });

    const [isGoalsOpen, setIsGoalsOpen] = useState(false);
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
    const [scanResult, setScanResult] = useState<FoodScanResult | null>(null);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isRemindersOpen, setIsRemindersOpen] = useState(false);
    const [showSupplementAnalytics, setShowSupplementAnalytics] = useState(false);

    const [foodSheetState, setFoodSheetState] = useState<{
        isOpen: boolean;
        tab: AddFoodTab;
        mealType?: string;
    }>({ isOpen: false, tab: 'search' });

    const closeFoodSheet = useCallback(() => {
        setFoodSheetState(prev => ({ ...prev, isOpen: false, mealType: undefined }));
        setCameraStream(prev => {
            if (prev) {
                prev.getTracks().forEach(t => t.stop());
            }
            return null;
        });
    }, []);

    const todayStr = getCurrentUtcDayKey();
    const todayDayOfWeek = parseUtcDayKey(todayStr).getUTCDay();
    const { data: dailyData, isLoading: isDailyLoading, isError: isDailyError, error: dailyError, refetch: refetchDaily } = useQuery({
        queryKey: ['daily-health', todayStr],
        queryFn: async () => {
            const res = await fetch(`/api/health/daily?date=${todayStr}`);
            if (!res.ok) throw new Error('Failed to fetch daily health');
            return res.json();
        },
    });

    const { data: supplements, isLoading: isSupplementsLoading, isError: isSupplementsError, error: supplementsError, refetch: refetchSupplements } = useQuery({
        queryKey: ['supplements'],
        queryFn: async () => {
            const res = await fetch('/api/health/supplements');
            if (!res.ok) throw new Error('Failed to fetch supplements');
            return res.json();
        },
    });

    const { data: stacks, isLoading: isStacksLoading, isError: isStacksError, error: stacksError, refetch: refetchStacks } = useQuery({
        queryKey: ['supplement-stacks'],
        queryFn: async () => {
            const res = await fetch('/api/health/supplements/stacks');
            if (!res.ok) throw new Error('Failed to fetch stacks');
            return res.json();
        },
    });

    const { data: targetData, isLoading: isTargetLoading, isError: isTargetError, error: targetError, refetch: refetchTarget } = useQuery({
        queryKey: ['nutrition-target', session?.user?.id],
        queryFn: async () => {
            const res = await fetch(`/api/health/nutrition/target?userId=${session?.user?.id}`);
            if (!res.ok) throw new Error('Failed to fetch targets');
            return res.json();
        },
        enabled: !!session?.user?.id,
    });

    const toggleSupplementMutation = useMutation({
        mutationFn: async ({ supplementId, taken }: { supplementId: string; taken: boolean }) => {
            const res = await fetch('/api/health/daily', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date: todayStr,
                    action: 'toggleSupplement',
                    supplementId,
                    taken,
                }),
            });
            if (!res.ok) throw new Error('Failed to toggle supplement');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['daily-health'] });
            toast.success('Supplement updated');
        },
        onError: () => {
            toast.error('Failed to update supplement');
        },
    });

    const toggleStackMutation = useMutation({
        mutationFn: async ({ stackId, taken }: { stackId: string; taken: boolean }) => {
            const res = await fetch('/api/health/daily', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date: todayStr,
                    action: 'toggleStack',
                    stackId,
                    taken,
                }),
            });
            if (!res.ok) throw new Error('Failed to toggle stack');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['daily-health'] });
            toast.success('Stack updated');
        },
        onError: () => {
            toast.error('Failed to update stack');
        },
    });

    const waterMutation = useMutation({
        mutationFn: async (amount: number) => {
            const res = await fetch('/api/health/daily', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date: todayStr,
                    action: 'updateWater',
                    amount,
                }),
            });
            if (!res.ok) throw new Error('Failed to update water');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['daily-health'] });
            toast.success('Water updated');
        },
        onError: () => {
            toast.error('Failed to update water');
        },
    });

    const copyYesterdayMutation = useMutation({
        mutationFn: async ({ mealType }: { mealType: string }) => {
            const res = await fetch('/api/health/nutrition/log/copy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    targetDate: todayStr,
                    mealType,
                }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to copy');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['daily-health'] });
            toast.success("Copied yesterday's meal");
        },
        onError: (err: Error) => {
            toast.error(err.message || "Failed to copy yesterday's meals");
        },
    });

    const showSteps = !!dailyData?.meta?.hasStepHistory;

    const activeCalories = dailyData?.dailyHealth?.activeCalories ?? 0;
    const exerciseCalories = targetData?.exerciseCalorieSource === 'health_connect'
        ? (activeCalories || dailyData?.exerciseCalories || 0)
        : (dailyData?.exerciseCalories || 0);
    const exerciseFactor = targetData?.exerciseCalorieFactor ?? 0.5;
    const exerciseBudget = Math.round(exerciseCalories * exerciseFactor);
    const baseTarget = targetData?.dailyCalories || 0;
    const effectiveTarget = baseTarget + exerciseBudget;

    const totalCalories = dailyData?.foodLogs?.reduce((sum: number, log: NutritionLog) => sum + (log.calories || 0), 0) || 0;
    const totalProtein = dailyData?.foodLogs?.reduce((sum: number, log: NutritionLog) => sum + (log.protein || 0), 0) || 0;
    const totalCarbs = dailyData?.foodLogs?.reduce((sum: number, log: NutritionLog) => sum + (log.carbs || 0), 0) || 0;
    const totalFats = dailyData?.foodLogs?.reduce((sum: number, log: NutritionLog) => sum + (log.fats || 0), 0) || 0;

    const targetProtein = targetData ? (targetData.dailyCalories * (targetData.proteinPercent / 100)) / 4 : 0;
    const targetCarbs = targetData ? (targetData.dailyCalories * (targetData.carbsPercent / 100)) / 4 : 0;
    const targetFats = targetData ? (targetData.dailyCalories * (targetData.fatsPercent / 100)) / 9 : 0;

    type SupplementBase = {
        id: string;
        name: string;
        amount: number;
        unit: string;
        timeOfDay: string;
        daysOfWeek: unknown;
        order: number;
        isActive: boolean;
        stackId: string | null;
    };
    const isSuppActiveToday = (supp: SupplementBase) => {
        if (supp.isActive === false) return false;
        const days = Array.isArray(supp.daysOfWeek) ? supp.daysOfWeek : [];
        if (!days || days.length === 0) return true;
        return days.includes(todayDayOfWeek);
    };

    const standaloneSupps = supplements?.filter((s: Supplement) => !s.stackId && isSuppActiveToday(s)) || [];

    const morningStandalone = standaloneSupps.filter((s: Supplement) => s.timeOfDay === 'MORNING');
    const noonStandalone = standaloneSupps.filter((s: Supplement) => s.timeOfDay === 'NOON');
    const eveningStandalone = standaloneSupps.filter((s: Supplement) => s.timeOfDay === 'EVENING');

    const getSupplementLog = (supplementId: string) => {
        return dailyData?.supplementLogs?.find((log: SupplementLog) => log.supplementId === supplementId);
    };

    const dailyHealth = dailyData?.dailyHealth;

    const handleTabKeyDown = (e: React.KeyboardEvent, index: number) => {
        if (e.key === 'ArrowRight') {
            e.preventDefault();
            const next = (index + 1) % HEALTH_TABS.length;
            setActiveHealthTab(HEALTH_TABS[next].id);
            tabRefs.current[next]?.focus();
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            const prev = (index - 1 + HEALTH_TABS.length) % HEALTH_TABS.length;
            setActiveHealthTab(HEALTH_TABS[prev].id);
            tabRefs.current[prev]?.focus();
        }
    };

    return (
        <div className="min-h-full bg-background pb-20 flex flex-col">
            {showSupplementAnalytics ? (
                <SupplementAnalyticsView
                    onClose={() => setShowSupplementAnalytics(false)}
                />
            ) : (
                <>
                    {showHeader && (
                        <AppTopBar
                            rightSlot={
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => setIsRemindersOpen(true)}
                                        className="topbar-btn p-1.5 rounded-sm"
                                        aria-label="Notification Reminders"
                                    >
                                        <Bell className="w-4 h-4" />
                                    </button>
                                </div>
                            }
                        />
                    )}

                    <div className={`mx-auto w-full max-w-md flex flex-col gap-4 pb-24 p-4 lg:max-w-7xl lg:px-8 lg:py-8 ${!showHeader ? 'pt-6' : ''}`}>
                        <div className="flex items-center justify-between gap-4 border-b border-line pb-3">
                            <div
                                role="tablist"
                                aria-label="Health sections"
                                className="inline-flex items-center gap-1 bg-background-secondary p-1 border border-line rounded-sm"
                            >
                                {HEALTH_TABS.map((tab, index) => {
                                    const isSelected = activeHealthTab === tab.id;
                                    return (
                                        <button
                                            key={tab.id}
                                            ref={(el) => {
                                                tabRefs.current[index] = el;
                                            }}
                                            id={`health-tab-${tab.id}`}
                                            role="tab"
                                            type="button"
                                            aria-selected={isSelected}
                                            aria-controls={`health-panel-${tab.id}`}
                                            tabIndex={isSelected ? 0 : -1}
                                            onClick={() => setActiveHealthTab(tab.id)}
                                            onKeyDown={(e) => handleTabKeyDown(e, index)}
                                            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-sm transition-colors ${
                                                isSelected
                                                    ? 'bg-background-tertiary text-foreground border border-line'
                                                    : 'text-foreground-muted hover:text-foreground border border-transparent'
                                            }`}
                                        >
                                            {tab.label}
                                        </button>
                                    );
                                })}
                            </div>

                            {!showHeader && (
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => setIsRemindersOpen(true)}
                                        className="p-2 border border-line rounded-sm text-foreground-muted hover:text-foreground"
                                        aria-label="Notification Reminders"
                                    >
                                        <Bell className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {activeHealthTab === 'today' && (
                            <div
                                id="health-panel-today"
                                role="tabpanel"
                                aria-labelledby="health-tab-today"
                                className="health-dashboard flex flex-col gap-4"
                            >
                                <div className="health-nutrition flex min-w-0 flex-col gap-4">
                                    {isTargetLoading ? (
                                        <SectionLoadingCard label="Loading nutrition summary..." />
                                    ) : isTargetError ? (
                                        <SectionErrorCard title="Nutrition summary unavailable" message={(targetError as Error)?.message || 'Failed to load nutrition targets.'} onRetry={() => refetchTarget()} />
                                    ) : (
                                        <NutritionSummary
                                            targetData={targetData}
                                            effectiveTarget={effectiveTarget}
                                            totalCalories={totalCalories}
                                            exerciseBudget={exerciseBudget}
                                            exerciseCalories={exerciseCalories}
                                            exerciseFactor={exerciseFactor}
                                            totalProtein={totalProtein}
                                            totalCarbs={totalCarbs}
                                            totalFats={totalFats}
                                            targetProtein={targetProtein}
                                            targetCarbs={targetCarbs}
                                            targetFats={targetFats}
                                            onOpenGoals={() => setIsGoalsOpen(true)}
                                            onOpenAnalytics={() => setActiveHealthTab('insights')}
                                            onOpenMealSuggestion={() => setFoodSheetState({ isOpen: true, tab: 'suggestions' })}
                                        />
                                    )}
                                </div>

                                <div className="health-overview flex min-w-0 flex-col gap-4">
                                    <div className="health-metrics flex min-w-0 flex-col gap-4">
                                        {isDailyLoading ? (
                                            <SectionLoadingCard label="Loading body metrics..." />
                                        ) : isDailyError ? (
                                            <SectionErrorCard title="Body metrics unavailable" message={(dailyError as Error)?.message || 'Failed to load health data.'} onRetry={() => refetchDaily()} />
                                        ) : (
                                            <BodyMetricsCard
                                                showSteps={showSteps}
                                                dailyHealth={dailyHealth}
                                                targetData={targetData}
                                                waterMutationPending={waterMutation.isPending}
                                                onOpenTrend={() => setActiveHealthTab('trends')}
                                                onAdjustWater={(amount) => waterMutation.mutate(amount)}
                                            />
                                        )}
                                    </div>

                                    <div className="health-readiness min-w-0">
                                        <ReadinessCard />
                                    </div>
                                </div>

                                <div className="health-actions min-w-0">
                                    <QuickActions
                                        onOpenAiScan={() => setFoodSheetState({ isOpen: true, tab: 'photo' })}
                                        onOpenBarcode={async () => {
                                            try {
                                                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                                                setCameraStream(stream);
                                            } catch {
                                                toast.error('Camera permission is required to scan barcodes. Please allow camera access in your browser settings.');
                                                return;
                                            }
                                            setFoodSheetState({ isOpen: true, tab: 'barcode' });
                                        }}
                                        onOpenSearch={() => setFoodSheetState({ isOpen: true, tab: 'search' })}
                                        onOpenLibrary={() => setFoodSheetState({ isOpen: true, tab: 'meals' })}
                                    />
                                </div>

                                <div className="health-meals min-w-0">
                                    {isDailyLoading ? (
                                        <SectionLoadingCard label="Loading meals..." />
                                    ) : isDailyError ? (
                                        <SectionErrorCard title="Meals unavailable" message={(dailyError as Error)?.message || 'Failed to load meals.'} onRetry={() => refetchDaily()} />
                                    ) : (
                                        <MealSection
                                            foodLogs={dailyData?.foodLogs || []}
                                            copyYesterdayMutation={copyYesterdayMutation}
                                            onOpenHistory={() => setIsHistoryOpen(true)}
                                            onQuickAddMeal={(mealType) => setFoodSheetState({ isOpen: true, tab: 'search', mealType })}
                                        />
                                    )}
                                </div>

                                <div className="health-supplements min-w-0">
                                    {isSupplementsError || isStacksError ? (
                                        <SectionErrorCard
                                            title="Supplements unavailable"
                                            message={(supplementsError as Error)?.message || (stacksError as Error)?.message || 'Failed to load supplements.'}
                                            onRetry={() => {
                                                refetchSupplements();
                                                refetchStacks();
                                            }}
                                        />
                                    ) : (
                                        <SupplementsSection
                                            supplements={supplements || []}
                                            stacks={(stacks || []).map((stack: SupplementStack) => ({
                                                ...stack,
                                                supplements: (stack.supplements || []).filter(isSuppActiveToday),
                                            }))}
                                            morningStandalone={morningStandalone}
                                            noonStandalone={noonStandalone}
                                            eveningStandalone={eveningStandalone}
                                            isLoading={isSupplementsLoading || isStacksLoading}
                                            getSupplementLog={getSupplementLog}
                                            onOpenAnalytics={() => setShowSupplementAnalytics(true)}
                                            onAddStack={() => {
                                                setStackToEdit(null);
                                                setIsAddStackModalOpen(true);
                                            }}
                                            onAddSupplement={() => {
                                                setSupplementToEdit(null);
                                                setIsAddModalOpen(true);
                                            }}
                                            onEditStack={(stack) => {
                                                setStackToEdit(stack);
                                                setIsAddStackModalOpen(true);
                                            }}
                                            onEditSupplement={(supplement) => {
                                                setSupplementToEdit(supplement);
                                                setIsAddModalOpen(true);
                                            }}
                                            onToggleStack={(stackId, taken) => toggleStackMutation.mutate({ stackId, taken })}
                                            onToggleSupplement={(supplementId, taken) => toggleSupplementMutation.mutate({ supplementId, taken })}
                                            onShowStats={(config) => setStatsConfig({ isOpen: true, ...config })}
                                            pendingSupplementId={toggleSupplementMutation.isPending ? toggleSupplementMutation.variables?.supplementId : null}
                                            pendingStackId={toggleStackMutation.isPending ? toggleStackMutation.variables?.stackId : null}
                                        />
                                    )}
                                </div>
                            </div>
                        )}

                        {activeHealthTab === 'trends' && (
                            <div
                                id="health-panel-trends"
                                role="tabpanel"
                                aria-labelledby="health-tab-trends"
                                className="grid grid-cols-1 lg:grid-cols-2 gap-6"
                            >
                                <div className="space-y-6">
                                    <HealthTrendContent
                                        metric="weight"
                                        enabled={true}
                                        showCompositionTab={false}
                                    />
                                    {showSteps && (
                                        <HealthTrendContent
                                            metric="steps"
                                            enabled={true}
                                            showCompositionTab={false}
                                        />
                                    )}
                                </div>

                                <div className="glass-card p-5">
                                    <h2 className="text-base font-semibold text-foreground mb-4">Body Composition</h2>
                                    <BodyCompositionTab />
                                </div>
                            </div>
                        )}

                        {activeHealthTab === 'insights' && (
                            <div
                                id="health-panel-insights"
                                role="tabpanel"
                                aria-labelledby="health-tab-insights"
                                className="space-y-6"
                            >
                                <WeeklyInsightsCard />
                                <NutritionAnalyticsView
                                    embedded={true}
                                    hideWeeklyInsights={true}
                                    onOpenGoals={() => setIsGoalsOpen(true)}
                                />
                            </div>
                        )}
                    </div>

                    <AddFoodSheet
                        isOpen={foodSheetState.isOpen}
                        onClose={closeFoodSheet}
                        initialTab={foodSheetState.tab}
                        defaultMealType={foodSheetState.mealType}
                        preAuthorizedStream={cameraStream}
                        remainingMacros={{
                            calories: Math.max(0, effectiveTarget - totalCalories),
                            protein: Math.max(0, targetProtein - totalProtein),
                            carbs: Math.max(0, targetCarbs - totalCarbs),
                            fats: Math.max(0, targetFats - totalFats),
                        }}
                        onLogSuccess={() => {
                            queryClient.invalidateQueries({ queryKey: ['daily-health'] });
                        }}
                        onScanResult={(result) => setScanResult(result)}
                    />

                    <AddSupplementModal
                        isOpen={isAddModalOpen}
                        onClose={() => {
                            setIsAddModalOpen(false);
                            setSupplementToEdit(null);
                        }}
                        supplementToEdit={supplementToEdit}
                    />

                    <AddStackModal
                        isOpen={isAddStackModalOpen}
                        onClose={() => {
                            setIsAddStackModalOpen(false);
                            setStackToEdit(null);
                        }}
                        stackToEdit={stackToEdit}
                    />

                    <SupplementStatsModal
                        isOpen={statsConfig.isOpen}
                        onClose={() => setStatsConfig({ ...statsConfig, isOpen: false })}
                        targetId={statsConfig.targetId}
                        targetType={statsConfig.targetType}
                        targetName={statsConfig.targetName}
                    />

                    <NutritionGoalsModal
                        isOpen={isGoalsOpen}
                        onClose={() => setIsGoalsOpen(false)}
                    />

                    {scanResult && (
                        <FoodScanResultView
                            isOpen={!!scanResult}
                            result={scanResult}
                            onClose={() => setScanResult(null)}
                            onLogSuccess={() => {
                                queryClient.invalidateQueries({ queryKey: ['daily-health'] });
                            }}
                        />
                    )}

                    <NutritionLogHistoryView
                        isOpen={isHistoryOpen}
                        onClose={() => setIsHistoryOpen(false)}
                    />

                    <ReminderSettingsModal
                        isOpen={isRemindersOpen}
                        onClose={() => setIsRemindersOpen(false)}
                    />
                </>
            )}
        </div>
    );
}
