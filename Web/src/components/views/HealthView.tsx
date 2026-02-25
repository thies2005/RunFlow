'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback } from 'react';
import { HeartPulse, Info, Plus, ChevronRight, Activity, Battery, ActivitySquare, Camera, Search, BarChart3, RefreshCw, Smartphone, Target, Sparkles, BookOpen, Bell } from 'lucide-react';
import { syncDailyHealth, isMobile, syncHistoricalHealthData, SyncHistoricalResult, isHealthConnectAvailable } from '@/lib/mobile/healthConnect';
import { Capacitor } from '@capacitor/core';

const IS_NATIVE = Capacitor.isNativePlatform();
import { format } from 'date-fns';
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
import { SupplementItem } from '@/components/health/SupplementItem';
import { ReminderSettingsModal } from './ReminderSettingsModal';

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
                alert(data.error || 'Product not found');
            }
        } catch (error) {
            console.error(error);
            alert("Error finding food");
        }
    }, []);

    const handleSyncHistoricalData = async () => {
        setIsSyncingHistory(true);
        try {
            const result: SyncHistoricalResult = await syncHistoricalHealthData(30);

            if (result.error) {
                alert(`Sync failed: ${result.error}`);
            } else {
                let message = `Synced ${result.synced} days of health data.`;
                if (result.stravaFallbackUsed) {
                    message += ' Weight imported from Strava.';
                }
                alert(message);
            }

            // Invalidate queries to refresh charts
            queryClient.invalidateQueries({ queryKey: ['daily-health'] });
        } catch (error) {
            console.error('Failed to sync historical data:', error);
            alert('Failed to sync health data. Please try again.');
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
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const { data: dailyData } = useQuery({
        queryKey: ['daily-health', todayStr],
        queryFn: async () => {
            const res = await fetch(`/api/health/daily?date=${todayStr}`);
            if (!res.ok) throw new Error('Failed to fetch daily health');
            return res.json();
        }
    });

    const { data: supplements, isLoading: isSupplementsLoading } = useQuery({
        queryKey: ['supplements'],
        queryFn: async () => {
            const res = await fetch('/api/health/supplements');
            if (!res.ok) throw new Error('Failed to fetch supplements');
            return res.json();
        }
    });

    const { data: stacks, isLoading: isStacksLoading } = useQuery({
        queryKey: ['supplement-stacks'],
        queryFn: async () => {
            const res = await fetch('/api/health/supplements/stacks');
            if (!res.ok) throw new Error('Failed to fetch stacks');
            return res.json();
        }
    });

    // Fetch nutrition targets to see if they need setup
    const { data: targetData } = useQuery({
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
        }
    });

    // Show steps if Health Connect is available on this device OR if backend has step data (synced from mobile earlier)
    const showSteps = hasHealthConnect || (dailyData?.dailyHealth?.steps && dailyData.dailyHealth.steps > 0);

    // Filtering standalone supplements
    const todayDayOfWeek = new Date().getDay();
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

    const renderSupplementItem = (supp: any) => {
        const log = getSupplementLog(supp.id);
        const isTaken = log?.taken || false;

        return (
            <SupplementItem
                key={supp.id}
                supplement={supp}
                isTaken={isTaken}
                variant="standalone"
                onEdit={(s) => {
                    setSupplementToEdit(s);
                    setIsAddModalOpen(true);
                }}
                onToggle={(id, taken) => toggleSupplementMutation.mutate({ supplementId: id, taken })}
                onShowStats={(id, name) => setStatsConfig({ isOpen: true, targetId: id, targetType: 'supplement', targetName: name })}
            />
        );
    };

    const renderStack = (stack: any) => {
        const activeSupplements = (stack.supplements || []).filter(isSuppActiveToday);
        const hasSupplements = activeSupplements.length > 0;

        // Check if all supplements in stack are taken today
        const allTaken = hasSupplements && activeSupplements.every((supp: any) => {
            const log = getSupplementLog(supp.id);
            return log?.taken;
        });

        return (
            <div key={stack.id} className="mb-4 bg-white/5 border border-white/10 rounded-xl overflow-hidden group">
                {/* Stack Header */}
                <div
                    className="flex items-center justify-between p-3 bg-white/5 border-b border-white/10 cursor-pointer hover:bg-white/10 transition-colors"
                >
                    <div
                        className="flex-1"
                        onClick={() => {
                            setStackToEdit(stack);
                            setIsAddStackModalOpen(true);
                        }}
                    >
                        <h4 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors flex items-center gap-1.5">
                            {stack.name} {stack.timeOfDay && <span className="text-[10px] uppercase font-bold text-gray-500 bg-white/10 px-1.5 py-0.5 rounded ml-1">{stack.timeOfDay}</span>}
                        </h4>
                        <p className="text-[10px] text-gray-500 mt-0.5">{stack.supplements?.length || 0} items</p>
                    </div>

                    {hasSupplements && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setStatsConfig({ isOpen: true, targetId: stack.id, targetType: 'stack', targetName: stack.name });
                                }}
                                className="w-6 h-6 rounded flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity bg-white/10 hover:bg-white/20"
                            >
                                <BarChart3 className="w-3 h-3 text-gray-400" />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleStackMutation.mutate({ stackId: stack.id, taken: !allTaken });
                                }}
                                className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors border ${allTaken ? 'bg-blue-500 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)] text-white' : 'bg-transparent border-gray-500 text-gray-500 hover:border-gray-400'}`}
                            >
                                {allTaken ? <HeartPulse className="w-4 h-4" /> : <div className="w-2.5 h-2.5 rounded-full bg-gray-500" />}
                            </button>
                        </div>
                    )}
                </div>

                {/* Stack Items */}
                {hasSupplements && (
                    <div className="p-2 space-y-1">
                        {activeSupplements.map((supp: any) => {
                            const log = getSupplementLog(supp.id);
                            const isTaken = log?.taken || false;

                            return (
                                <SupplementItem
                                    key={supp.id}
                                    supplement={supp}
                                    isTaken={isTaken}
                                    variant="stack-item"
                                    onEdit={(s) => {
                                        setSupplementToEdit(s);
                                        setIsAddModalOpen(true);
                                    }}
                                    onToggle={(id, taken) => toggleSupplementMutation.mutate({ supplementId: id, taken })}
                                />
                            )
                        })}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="min-h-full bg-background pb-20 flex flex-col">
            {showAnalytics ? (
                <NutritionAnalyticsView
                    onClose={() => setShowAnalytics(false)}
                    onOpenGoals={() => setIsGoalsOpen(true)}
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

                    <div className={`p-4 ${!showHeader ? 'pt-8' : ''} mx-auto w-full max-w-lg md:max-w-3xl lg:max-w-7xl`}>
                        <div className="flex flex-col gap-6 md:grid md:grid-cols-2 lg:grid-cols-12 lg:items-start">
                            {!isMobileDevice && !bannerDismissed && (
                                <div className="md:col-span-2 lg:col-span-12 bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl flex items-start gap-3">
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

                            {/* Left Column: Quick Stats */}
                            <div className="flex flex-col gap-6 md:col-span-2 lg:col-span-3">
                                {/* Steps and Weight Cards */}
                                <div className={`grid gap-4 ${showSteps ? 'grid-cols-2 lg:grid-cols-1' : 'grid-cols-1'}`}>
                                    {showSteps && (
                                        <button
                                            onClick={() => setActiveTrendMetric('steps')}
                                            className="glass-card p-4 rounded-xl border border-glass-border hover:bg-white/5 transition-colors text-left"
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2 text-green-400 font-medium">
                                                    <ActivitySquare className="w-4 h-4" /> Steps
                                                </div>
                                                <ChevronRight className="w-4 h-4 text-gray-500" />
                                            </div>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-2xl font-bold text-white">{dailyData?.dailyHealth?.steps || 0}</span>
                                                <span className="text-xs text-gray-400 font-medium">steps today</span>
                                            </div>
                                        </button>
                                    )}

                                    <button
                                        onClick={() => setActiveTrendMetric('weight')}
                                        className="glass-card p-4 rounded-xl border border-glass-border hover:bg-white/5 transition-colors text-left"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2 text-blue-400 font-medium">
                                                <Activity className="w-4 h-4" /> Weight
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-gray-500" />
                                        </div>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-2xl font-bold text-white">{dailyData?.dailyHealth?.weight ? dailyData.dailyHealth.weight.toFixed(1) : '--'}</span>
                                            <span className="text-xs text-gray-400 font-medium">kg</span>
                                        </div>
                                    </button>
                                </div>
                            </div> {/* End Left Column */}

                            {/* Middle Column: Food */}
                            <div className="flex flex-col gap-6 md:col-span-1 lg:col-span-5">
                                {/* Food Logging Section */}
                                <div className="glass-card p-4 rounded-xl border border-glass-border h-full flex flex-col">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <h3 className="font-semibold text-white">Food</h3>
                                            <p className="text-xs text-gray-400 mt-1">Log your daily nutrition</p>
                                        </div>
                                        <button
                                            onClick={() => setShowAnalytics(true)}
                                            className="bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/30 transition-colors rounded-lg px-3 py-1.5 flex items-center gap-1.5"
                                        >
                                            <BarChart3 className="w-3.5 h-3.5 text-pink-400" />
                                            <span className="text-xs font-medium text-pink-400">Analytics</span>
                                        </button>
                                    </div>

                                    {targetData?.isDefault && (
                                        <div className="bg-pink-500/10 border border-pink-500/20 rounded-xl p-4 mb-4 flex items-start gap-3">
                                            <Target className="w-5 h-5 text-pink-400 shrink-0 mt-0.5" />
                                            <div className="flex-1">
                                                <h4 className="text-sm font-semibold text-pink-400 mb-1">Set Your Nutrition Goals</h4>
                                                <p className="text-xs text-pink-200/70 mb-3">Define your calorie and macro targets to unlock personalized insights and detailed adherence scoring.</p>
                                                <button
                                                    onClick={() => setIsGoalsOpen(true)}
                                                    className="bg-pink-500 text-white text-xs font-semibold px-4 py-2 rounded-lg w-full shadow-lg shadow-pink-500/20 hover:bg-pink-600 transition-colors"
                                                >
                                                    Setup Goals
                                                </button>
                                            </div>
                                        </div>
                                    )}



                                    <div className="grid grid-cols-2 gap-3">
                                        {/* AI Food Scanner - Primary */}
                                        <button
                                            onClick={() => setIsFoodScannerOpen(true)}
                                            className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20 border border-amber-500/20 transition-all rounded-lg p-3 flex flex-col items-center justify-center gap-2 col-span-2"
                                        >
                                            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                                                <Sparkles className="w-5 h-5 text-amber-400" />
                                            </div>
                                            <span className="text-sm font-medium text-white">📸 AI Food Scan</span>
                                            <span className="text-[11px] text-gray-400">Snap a photo for instant analysis</span>
                                        </button>

                                        <button
                                            onClick={async () => {
                                                if (!IS_NATIVE) {
                                                    try {
                                                        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                                                        setCameraStream(stream);
                                                    } catch (err) {
                                                        alert('Camera permission is required to scan barcodes. Please allow camera access in your browser settings.');
                                                        return;
                                                    }
                                                }
                                                setIsScannerOpen(true);
                                            }}
                                            className="bg-white/5 hover:bg-white/10 border border-white/10 transition-colors rounded-lg p-3 flex flex-col items-center justify-center gap-2"
                                        >
                                            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                                                <Camera className="w-5 h-5 text-blue-400" />
                                            </div>
                                            <span className="text-sm font-medium text-white">Scan Barcode</span>
                                        </button>
                                        <button
                                            onClick={() => setIsManualEntryOpen(true)}
                                            className="bg-white/5 hover:bg-white/10 border border-white/10 transition-colors rounded-lg p-3 flex flex-col items-center justify-center gap-2"
                                        >
                                            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                                                <Search className="w-5 h-5 text-green-400" />
                                            </div>
                                            <span className="text-sm font-medium text-white">Search / Manual</span>
                                        </button>
                                        <button
                                            onClick={() => setIsMealLibraryOpen(true)}
                                            className="bg-white/5 hover:bg-white/10 border border-white/10 transition-colors rounded-lg p-3 flex flex-col items-center justify-center gap-2 col-span-2"
                                        >
                                            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                                                <BookOpen className="w-5 h-5 text-purple-400" />
                                            </div>
                                            <span className="text-sm font-medium text-white">📚 Meal Library</span>
                                        </button>
                                    </div>

                                    {dailyData?.foodLogs && dailyData.foodLogs.length > 0 ? (
                                        <div className="mt-6">
                                            <div className="flex items-center justify-between mb-3">
                                                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Log Preview</h4>
                                                <button
                                                    onClick={() => setIsHistoryOpen(true)}
                                                    className="text-xs font-medium text-pink-400 hover:text-pink-300 flex items-center gap-1"
                                                >
                                                    View All History <ChevronRight className="w-3 h-3" />
                                                </button>
                                            </div>
                                            <div className="space-y-2 cursor-pointer" onClick={() => setIsHistoryOpen(true)}>
                                                {dailyData.foodLogs.slice(0, 3).map((log: any) => (
                                                    <div key={log.id} className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                                                        <div>
                                                            <p className="text-sm font-medium text-white line-clamp-1">{log.foodItem?.name || log.mealType || 'Unknown Food'}</p>
                                                            <p className="text-xs text-gray-400">{log.quantity}x {log.mealType || 'SNACK'}</p>
                                                        </div>
                                                        <div className="text-right whitespace-nowrap">
                                                            <p className="text-sm font-bold text-pink-400">{Math.round(log.calories)} kcal</p>
                                                        </div>
                                                    </div>
                                                ))}
                                                {dailyData.foodLogs.length > 3 && (
                                                    <div className="text-center py-2 text-xs text-gray-400">
                                                        + {dailyData.foodLogs.length - 3} more items today
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="mt-6 text-center py-4 border border-dashed border-white/10 rounded-lg">
                                            <p className="text-sm text-gray-400 mb-2">No food logged yet today</p>
                                            <button
                                                onClick={() => setIsHistoryOpen(true)}
                                                className="text-xs font-medium text-pink-400 hover:text-pink-300 flex items-center gap-1 mx-auto"
                                            >
                                                View History <ChevronRight className="w-3 h-3" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div> {/* End Middle Column */}

                            {/* Right Column: Supplements */}
                            <div className="flex flex-col gap-6 md:col-span-1 lg:col-span-4">
                                {/* Supplements List */}
                                <div className="glass-card p-4 rounded-xl border border-glass-border h-full flex flex-col">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-semibold text-white flex items-center gap-2">
                                            <Battery className="w-4 h-4 text-purple-400" /> Daily Supplements
                                        </h3>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    setStackToEdit(null);
                                                    setIsAddStackModalOpen(true);
                                                }}
                                                className="bg-white/5 hover:bg-white/10 text-white flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-white/10 transition-colors"
                                            >
                                                <Plus className="w-3.5 h-3.5" /> Stack
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setSupplementToEdit(null);
                                                    setIsAddModalOpen(true);
                                                }}
                                                className="bg-white/10 hover:bg-white/15 text-white flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
                                            >
                                                <Plus className="w-3.5 h-3.5" /> Supp
                                            </button>
                                        </div>
                                    </div>

                                    {isSupplementsLoading || isStacksLoading ? (
                                        <p className="text-xs text-gray-500">Loading supplements...</p>
                                    ) : supplements?.length === 0 && stacks?.length === 0 ? (
                                        <div className="flex gap-3 mt-2">
                                            <button
                                                onClick={() => {
                                                    setSupplementToEdit(null);
                                                    setIsAddModalOpen(true);
                                                }}
                                                className="flex-1 text-center py-6 border border-dashed border-white/10 hover:border-white/20 hover:bg-white/5 rounded-lg transition-colors group flex flex-col items-center justify-center gap-2"
                                            >
                                                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                    <Plus className="w-5 h-5 text-gray-400" />
                                                </div>
                                                <p className="text-sm text-gray-400 tracking-wide font-medium group-hover:text-white transition-colors">Add Supplement</p>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setStackToEdit(null);
                                                    setIsAddStackModalOpen(true);
                                                }}
                                                className="flex-1 text-center py-6 border border-dashed border-white/10 hover:border-white/20 hover:bg-white/5 rounded-lg transition-colors group flex flex-col items-center justify-center gap-2"
                                            >
                                                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform border border-blue-500/20">
                                                    <Plus className="w-5 h-5 text-blue-400" />
                                                </div>
                                                <p className="text-sm text-gray-400 tracking-wide font-medium group-hover:text-blue-400 transition-colors">Create Stack</p>
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {/* Render Stacks First */}
                                            {stacks?.map(renderStack)}

                                            {/* Render Standalone Supplements grouped by Time */}
                                            {morningStandalone.length > 0 && (
                                                <div>
                                                    <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 px-1">Morning Standalones</h4>
                                                    {morningStandalone.map(renderSupplementItem)}
                                                </div>
                                            )}
                                            {noonStandalone.length > 0 && (
                                                <div>
                                                    <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 mt-4 px-1">Noon Standalones</h4>
                                                    {noonStandalone.map(renderSupplementItem)}
                                                </div>
                                            )}
                                            {eveningStandalone.length > 0 && (
                                                <div>
                                                    <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 mt-4 px-1">Evening Standalones</h4>
                                                    {eveningStandalone.map(renderSupplementItem)}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div> {/* End Right Column */}
                        </div> {/* End Grid */}
                    </div> {/* End Container */}

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
                        }}
                        initialFood={scannedFood}
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
                </>
            )}
        </div>
    );
}
