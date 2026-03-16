'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback } from 'react';
import { HeartPulse, Info, Bell, RefreshCw } from 'lucide-react';
import { isMobile, syncHistoricalHealthData, SyncHistoricalResult, isHealthConnectAvailable } from '@/lib/mobile/healthConnect';
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';

const IS_NATIVE = Capacitor.isNativePlatform();
import { useSession } from 'next-auth/react';
import { AddSupplementModal } from './AddSupplementModal';
import { HealthTrendModal } from './HealthTrendModal';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { ManualFoodEntryModal } from './ManualFoodEntryModal';
import NutritionAnalyticsView from './NutritionAnalyticsView';
import { NutritionGoalsModal } from './NutritionGoalsModal';
import { FoodScannerModal } from './FoodScannerModal';
import { FoodScanResultView } from './FoodScanResultView';
import { MealLibraryModal } from './MealLibraryModal';
import { NutritionLogHistoryView } from './NutritionLogHistoryView';
import { AddStackModal } from './AddStackModal';
import { SupplementStatsModal } from './SupplementStatsModal';
import { ReminderSettingsModal } from './ReminderSettingsModal';
import { AiMealSuggestionModal } from './AiMealSuggestionModal';
import SupplementAnalyticsView from './SupplementAnalyticsView';
import { getCurrentUtcDayKey, parseUtcDayKey } from '@/lib/health/dates';
import { NutritionSummary } from './health/NutritionSummary';
import { BodyMetricsCard } from './health/BodyMetricsCard';
import { QuickActions } from './health/QuickActions';
import { MealSection } from './health/MealSection';
import { SupplementsSection } from './health/SupplementsSection';
import { SectionErrorCard, SectionLoadingCard } from './health/SectionStates';

interface HealthViewProps {
    showHeader?: boolean;
}

export default function HealthView({ showHeader = true }: HealthViewProps) {
    const { data: session } = useSession();
    const queryClient = useQueryClient();
    const [isMobileDevice, setIsMobileDevice] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isAddStackModalOpen, setIsAddStackModalOpen] = useState(false);
    const [supplementToEdit, setSupplementToEdit] = useState<any | null>(null);
    const [stackToEdit, setStackToEdit] = useState<any | null>(null);

    // Stats Modal State
    const [statsConfig, setStatsConfig] = useState<{ isOpen: boolean, targetId: string | null, targetType: 'supplement' | 'stack' | null, targetName: string }>({
        isOpen: false, targetId: null, targetType: null, targetName: ''
    });

    const [activeTrendMetric, setActiveTrendMetric] = useState<'steps' | 'weight' | null>(null);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [isManualEntryOpen, setIsManualEntryOpen] = useState(false);
    const [showAnalytics, setShowAnalytics] = useState(false);
    const [isGoalsOpen, setIsGoalsOpen] = useState(false);
    const [isSyncingHistory, setIsSyncingHistory] = useState(false);
    const [hasHealthConnect, setHasHealthConnect] = useState(false);
    const [bannerDismissed, setBannerDismissed] = useState(true);
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
    const [scannedFood, setScannedFood] = useState<any | null>(null);
    const [isFoodScannerOpen, setIsFoodScannerOpen] = useState(false);
    const [scanResult, setScanResult] = useState<any | null>(null);
    const [isMealLibraryOpen, setIsMealLibraryOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isRemindersOpen, setIsRemindersOpen] = useState(false);
    const [isMealSuggestionOpen, setIsMealSuggestionOpen] = useState(false);
    const [showSupplementAnalytics, setShowSupplementAnalytics] = useState(false);
    const [quickAddProps, setQuickAddProps] = useState<{tab?: 'search' | 'custom', mealType?: string}>({});

    const handleBarcodeScanned = useCallback(async (barcode: string) => {
        setIsScannerOpen(false);
        try {
            const res = await fetch(`/api/health/nutrition/scan?barcode=${barcode}`);
            const data = await res.json();
            if (res.ok && data.name) {
                // Pass scanned food directly to the log modal
                setScannedFood(data);
                setIsManualEntryOpen(true);
            } else {
                toast.error(data.error || 'Product not found');
            }
        } catch (error) {
            console.error(error);
            toast.error('Error finding food');
        }
    }, []);

    const handleSyncHistoricalData = async () => {
        setIsSyncingHistory(true);
        try {
            const result: SyncHistoricalResult = await syncHistoricalHealthData(30);

            if (result.error) {
                toast.error(`Sync failed: ${result.error}`);
            } else {
                let message = `Synced ${result.synced} days of health data.`;
                if (result.stravaFallbackUsed) {
                    message += ' Weight imported from Strava.';
                }
                toast.success(message);
            }

            // Invalidate queries to refresh charts
            queryClient.invalidateQueries({ queryKey: ['daily-health'] });
        } catch (error) {
            console.error('Failed to sync historical data:', error);
            toast.error('Failed to sync health data. Please try again.');
        } finally {
            setIsSyncingHistory(false);
        }
    };

    useEffect(() => {
        setIsMobileDevice(isMobile());
        // Check if mobile banner was dismissed within last 7 days
        const dismissed = localStorage.getItem('health-banner-dismissed');
        if (dismissed) {
            const dismissedAt = parseInt(dismissed, 10);
            const sevenDays = 7 * 24 * 60 * 60 * 1000;
            setBannerDismissed(Date.now() - dismissedAt < sevenDays);
        } else {
            setBannerDismissed(false);
        }
        if (isMobile()) {
            isHealthConnectAvailable().then(available => setHasHealthConnect(available));
        }
    }, [queryClient]);

    // ... (rest of queries)
    const todayStr = getCurrentUtcDayKey();
    const todayDayOfWeek = parseUtcDayKey(todayStr).getUTCDay();
    const { data: dailyData, isLoading: isDailyLoading, isError: isDailyError, error: dailyError, refetch: refetchDaily } = useQuery({
        queryKey: ['daily-health', todayStr],
        queryFn: async () => {
            const res = await fetch(`/api/health/daily?date=${todayStr}`);
            if (!res.ok) throw new Error('Failed to fetch daily health');
            return res.json();
        }
    });

    const { data: supplements, isLoading: isSupplementsLoading, isError: isSupplementsError, error: supplementsError, refetch: refetchSupplements } = useQuery({
        queryKey: ['supplements'],
        queryFn: async () => {
            const res = await fetch('/api/health/supplements');
            if (!res.ok) throw new Error('Failed to fetch supplements');
            return res.json();
        }
    });

    const { data: stacks, isLoading: isStacksLoading, isError: isStacksError, error: stacksError, refetch: refetchStacks } = useQuery({
        queryKey: ['supplement-stacks'],
        queryFn: async () => {
            const res = await fetch('/api/health/supplements/stacks');
            if (!res.ok) throw new Error('Failed to fetch stacks');
            return res.json();
        }
    });

    // Fetch nutrition targets to see if they need setup
    const { data: targetData, isLoading: isTargetLoading, isError: isTargetError, error: targetError, refetch: refetchTarget } = useQuery({
        queryKey: ['nutrition-target', session?.user?.id],
        queryFn: async () => {
            const res = await fetch(`/api/health/nutrition/target?userId=${session?.user?.id}`);
            if (!res.ok) throw new Error('Failed to fetch targets');
            return res.json();
        },
        enabled: !!session?.user?.id
    });

    const toggleSupplementMutation = useMutation({
        mutationFn: async ({ supplementId, taken }: { supplementId: string, taken: boolean }) => {
            const res = await fetch('/api/health/daily', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date: todayStr,
                    action: 'toggleSupplement',
                    supplementId,
                    taken
                })
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
        }
    });

    const toggleStackMutation = useMutation({
        mutationFn: async ({ stackId, taken }: { stackId: string, taken: boolean }) => {
            const res = await fetch('/api/health/daily', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date: todayStr,
                    action: 'toggleStack',
                    stackId,
                    taken
                })
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
        }
    });

    const waterMutation = useMutation({
        mutationFn: async (amount: number) => {
            const res = await fetch('/api/health/daily', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date: todayStr,
                    action: 'updateWater',
                    amount
                })
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
        }
    });

    const copyYesterdayMutation = useMutation({
        mutationFn: async ({ mealType }: { mealType: string }) => {
            const res = await fetch('/api/health/nutrition/log/copy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    targetDate: todayStr,
                    mealType,
                })
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to copy');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['daily-health'] });
            toast.success('Copied yesterday\'s meal');
        },
        onError: (err: any) => {
            toast.error(err.message || 'Failed to copy yesterday\'s meals');
        }
    });

    const showSteps = hasHealthConnect || !!dailyData?.meta?.hasStepHistory;

    // Exercise calorie budget
    const activeCalories = dailyData?.dailyHealth?.activeCalories ?? 0;
    const exerciseCalories = targetData?.exerciseCalorieSource === 'health_connect'
        ? (activeCalories || dailyData?.exerciseCalories || 0)
        : (dailyData?.exerciseCalories || 0);
    const exerciseFactor = targetData?.exerciseCalorieFactor ?? 0.5;
    const exerciseBudget = Math.round(exerciseCalories * exerciseFactor);
    const baseTarget = targetData?.dailyCalories || 0;
    const effectiveTarget = baseTarget + exerciseBudget;

    // Compute calorie/macro totals from today's food logs
    const totalCalories = dailyData?.foodLogs?.reduce((sum: number, log: any) => sum + (log.calories || 0), 0) || 0;
    const totalProtein = dailyData?.foodLogs?.reduce((sum: number, log: any) => sum + (log.protein || 0), 0) || 0;
    const totalCarbs = dailyData?.foodLogs?.reduce((sum: number, log: any) => sum + (log.carbs || 0), 0) || 0;
    const totalFats = dailyData?.foodLogs?.reduce((sum: number, log: any) => sum + (log.fats || 0), 0) || 0;

    const targetProtein = targetData ? (targetData.dailyCalories * (targetData.proteinPercent / 100)) / 4 : 0;
    const targetCarbs = targetData ? (targetData.dailyCalories * (targetData.carbsPercent / 100)) / 4 : 0;
    const targetFats = targetData ? (targetData.dailyCalories * (targetData.fatsPercent / 100)) / 9 : 0;

    // Filtering standalone supplements
    const isSuppActiveToday = (supp: any) => {
        if (supp.isActive === false) return false;
        if (!supp.daysOfWeek || supp.daysOfWeek.length === 0) return true;
        return supp.daysOfWeek.includes(todayDayOfWeek);
    };

    const standaloneSupps = supplements?.filter((s: any) => !s.stackId && isSuppActiveToday(s)) || [];

    const morningStandalone = standaloneSupps.filter((s: any) => s.timeOfDay === 'MORNING');
    const noonStandalone = standaloneSupps.filter((s: any) => s.timeOfDay === 'NOON');
    const eveningStandalone = standaloneSupps.filter((s: any) => s.timeOfDay === 'EVENING');

    const getSupplementLog = (supplementId: string) => {
        return dailyData?.supplementLogs?.find((log: any) => log.supplementId === supplementId);
    };

    const dailyHealth = dailyData?.dailyHealth;

    return (
        <div className="min-h-full bg-background pb-20 flex flex-col">
            {showAnalytics ? (
                <NutritionAnalyticsView
                    onClose={() => setShowAnalytics(false)}
                />
            ) : showSupplementAnalytics ? (
                <SupplementAnalyticsView
                    onClose={() => setShowSupplementAnalytics(false)}
                />
            ) : (
                <>
                    {showHeader && (
                        <header className="border-b border-glass-border backdrop-blur-md bg-background/80 sticky top-0 z-50 pt-[env(safe-area-inset-top)]">
                            <div className="flex items-center justify-between px-4 py-3">
                                <span className="text-lg font-bold text-white flex items-center gap-2">
                                    <HeartPulse className="w-5 h-5 text-red-500" /> Health
                                </span>
                                <div className="flex items-center gap-2">
                                    {isMobileDevice && (
                                        <button
                                            onClick={handleSyncHistoricalData}
                                            disabled={isSyncingHistory}
                                            className="p-2 -mr-2 rounded-full hover:bg-white/10 transition-colors"
                                            aria-label="Sync Health Data"
                                        >
                                            <RefreshCw className={`w-5 h-5 text-gray-400 ${isSyncingHistory ? 'animate-spin' : ''}`} />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setIsRemindersOpen(true)}
                                        className="p-2 -mr-2 rounded-full hover:bg-white/10 transition-colors"
                                        aria-label="Notification Reminders"
                                    >
                                        <Bell className="w-5 h-5 text-gray-400" />
                                    </button>
                                </div>
                            </div>
                        </header>
                    )}

                    <div className={`mx-auto w-full max-w-md flex flex-col gap-4 pb-24 p-4 ${!showHeader ? 'pt-8' : ''}`}>
                        {!isMobileDevice && !bannerDismissed && (
                            <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl flex items-start gap-3">
                                <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                                <div className="text-sm flex-1">
                                    <p className="font-semibold text-blue-400 mb-1">Mobile App Recommended</p>
                                    <p className="text-blue-200/80">Step and weight tracking use Health Connect, which is only available on the mobile app. You can manually enter weight here or track supplements.</p>
                                </div>
                                <button
                                    onClick={() => {
                                        localStorage.setItem('health-banner-dismissed', Date.now().toString());
                                        setBannerDismissed(true);
                                    }}
                                    className="text-blue-400/60 hover:text-blue-400 transition-colors text-xs font-medium shrink-0"
                                >
                                    Dismiss
                                </button>
                            </div>
                        )}

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
                                onOpenAnalytics={() => setShowAnalytics(true)}
                                onOpenMealSuggestion={() => setIsMealSuggestionOpen(true)}
                            />
                        )}

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
                                onOpenTrend={(metric) => setActiveTrendMetric(metric)}
                                onAdjustWater={(amount) => waterMutation.mutate(amount)}
                            />
                        )}

                        <QuickActions
                            onOpenAiScan={() => setIsFoodScannerOpen(true)}
                            onOpenBarcode={async () => {
                                if (!IS_NATIVE) {
                                    try {
                                        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                                        setCameraStream(stream);
                                    } catch (err) {
                                        toast.error('Camera permission is required to scan barcodes. Please allow camera access in your browser settings.');
                                        return;
                                    }
                                }
                                setIsScannerOpen(true);
                            }}
                            onOpenSearch={() => {
                                setQuickAddProps({ tab: 'search' });
                                setIsManualEntryOpen(true);
                            }}
                            onOpenLibrary={() => setIsMealLibraryOpen(true)}
                        />

                        {isDailyLoading ? (
                            <SectionLoadingCard label="Loading meals..." />
                        ) : isDailyError ? (
                            <SectionErrorCard title="Meals unavailable" message={(dailyError as Error)?.message || 'Failed to load meals.'} onRetry={() => refetchDaily()} />
                        ) : (
                            <MealSection
                                foodLogs={dailyData?.foodLogs || []}
                                copyYesterdayMutation={copyYesterdayMutation}
                                onOpenHistory={() => setIsHistoryOpen(true)}
                                onQuickAddMeal={(mealType) => {
                                    setQuickAddProps({ tab: 'search', mealType });
                                    setIsManualEntryOpen(true);
                                }}
                            />
                        )}

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
                                stacks={(stacks || []).map((stack: any) => ({
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

                    <HealthTrendModal
                        isOpen={activeTrendMetric !== null}
                        onClose={() => setActiveTrendMetric(null)}
                        metric={activeTrendMetric}
                    />

                    <BarcodeScannerModal
                        isOpen={isScannerOpen}
                        onClose={() => {
                            setIsScannerOpen(false);
                            if (cameraStream) {
                                cameraStream.getTracks().forEach(t => t.stop());
                                setCameraStream(null);
                            }
                        }}
                        onScan={handleBarcodeScanned}
                        preAuthorizedStream={cameraStream}
                    />

                    <ManualFoodEntryModal
                        isOpen={isManualEntryOpen}
                        onClose={() => {
                            setIsManualEntryOpen(false);
                            setScannedFood(null);
                            setQuickAddProps({});
                        }}
                        initialFood={scannedFood}
                        defaultTab={quickAddProps.tab}
                        defaultMealType={quickAddProps.mealType}
                    />

                    <NutritionGoalsModal
                        isOpen={isGoalsOpen}
                        onClose={() => setIsGoalsOpen(false)}
                    />

                    <FoodScannerModal
                        isOpen={isFoodScannerOpen}
                        onClose={() => setIsFoodScannerOpen(false)}
                        onScanComplete={(result) => {
                            setIsFoodScannerOpen(false);
                            setScanResult(result);
                        }}
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

                    <MealLibraryModal
                        isOpen={isMealLibraryOpen}
                        onClose={() => setIsMealLibraryOpen(false)}
                        onSelectMeal={(meal) => {
                            setIsMealLibraryOpen(false);
                            setScanResult({
                                mealName: meal.name,
                                items: meal.items,
                                totalCalories: meal.totalCalories,
                                totalProtein: meal.totalProtein,
                                totalCarbs: meal.totalCarbs,
                                totalFats: meal.totalFats,
                                confidence: 'high' as const,
                            });
                        }}
                    />

                    <NutritionLogHistoryView
                        isOpen={isHistoryOpen}
                        onClose={() => setIsHistoryOpen(false)}
                    />

                    <ReminderSettingsModal
                        isOpen={isRemindersOpen}
                        onClose={() => setIsRemindersOpen(false)}
                    />

                    {isMealSuggestionOpen && targetData && (
                        <AiMealSuggestionModal
                            isOpen={isMealSuggestionOpen}
                            onClose={() => setIsMealSuggestionOpen(false)}
                            remainingMacros={{
                                calories: Math.max(0, effectiveTarget - totalCalories),
                                protein: Math.max(0, targetProtein - totalProtein),
                                carbs: Math.max(0, targetCarbs - totalCarbs),
                                fats: Math.max(0, targetFats - totalFats)
                            }}
                            onLogSuccess={() => {
                                queryClient.invalidateQueries({ queryKey: ['daily-health'] });
                            }}
                        />
                    )}
                </>
            )}
        </div>
    );
}
