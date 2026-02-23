'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { HeartPulse, Info, Plus, ChevronRight, Activity, Battery, ActivitySquare, Camera, Search } from 'lucide-react';
import { syncDailyHealth, backfillHistoricalHealth, isMobile } from '@/lib/mobile/healthConnect';
import { format } from 'date-fns';
import { AddSupplementModal } from './AddSupplementModal';
import { HealthTrendModal } from './HealthTrendModal';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { ManualFoodEntryModal } from './ManualFoodEntryModal';

interface HealthViewProps {
    showHeader?: boolean;
}

export default function HealthView({ showHeader = true }: HealthViewProps) {
    const queryClient = useQueryClient();
    const [isMobileDevice, setIsMobileDevice] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [activeTrendMetric, setActiveTrendMetric] = useState<'steps' | 'weight' | null>(null);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [isManualEntryOpen, setIsManualEntryOpen] = useState(false);

    const handleBarcodeScanned = async (barcode: string) => {
        setIsScannerOpen(false);
        try {
            const res = await fetch(`/api/health/nutrition/scan?barcode=${barcode}`);
            const data = await res.json();
            console.log("Found Food!", data);
            alert(`Found: ${data.name} - ${data.calories}kcal`);
        } catch (error) {
            console.error(error);
            alert("Error finding food");
        }
    };

    useEffect(() => {
        setIsMobileDevice(isMobile());
        if (isMobile()) {
            // Background sync of steps/weight on mount for mobile
            syncDailyHealth().then(() => {
                queryClient.invalidateQueries({ queryKey: ['daily-health'] });
            });
        }
    }, [queryClient]);

    // ... (rest of queries)
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const { data: dailyData, isLoading: isDailyLoading } = useQuery({
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

    // Group supplements by time of day
    const morningSupplements = supplements?.filter((s: any) => s.timeOfDay === 'MORNING') || [];
    const noonSupplements = supplements?.filter((s: any) => s.timeOfDay === 'NOON') || [];
    const eveningSupplements = supplements?.filter((s: any) => s.timeOfDay === 'EVENING') || [];

    const getSupplementLog = (supplementId: string) => {
        return dailyData?.supplementLogs?.find((log: any) => log.supplementId === supplementId);
    };

    const renderSupplementItem = (supp: any) => {
        const log = getSupplementLog(supp.id);
        const isTaken = log?.taken || false;

        return (
            <div key={supp.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 mb-2">
                <div>
                    <p className="text-sm font-medium text-white">{supp.name}</p>
                    <p className="text-xs text-gray-500">{supp.amount} {supp.unit}</p>
                </div>
                <button
                    onClick={() => toggleSupplementMutation.mutate({ supplementId: supp.id, taken: !isTaken })}
                    className={`w-6 h-6 rounded border flex items-center justify-center transition-colors ${isTaken ? 'bg-green-500 border-green-500' : 'bg-transparent border-gray-500'}`}
                >
                    {isTaken && <HeartPulse className="w-3 h-3 text-white" />}
                </button>
            </div>
        );
    };

    return (
        <div className="min-h-full bg-background pb-20">
            {showHeader && (
                <header className="border-b border-glass-border backdrop-blur-md bg-background/80 sticky top-0 z-50 pt-[env(safe-area-inset-top)]">
                    <div className="flex items-center px-4 py-3">
                        <span className="text-lg font-bold text-white flex items-center gap-2">
                            <HeartPulse className="w-5 h-5 text-red-500" /> Health
                        </span>
                    </div>
                </header>
            )}

            <div className={`p-4 ${!showHeader ? 'pt-8' : ''} space-y-6 max-w-lg mx-auto`}>
                {!isMobileDevice && (
                    <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl flex items-start gap-3">
                        <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                        <div className="text-sm">
                            <p className="font-semibold text-blue-400 mb-1">Mobile App Recommended</p>
                            <p className="text-blue-200/80">Step and weight tracking use Health Connect, which is only available on identical mobile apps. You can manually enter weight here or track supplements.</p>
                        </div>
                    </div>
                )}

                {/* Steps and Weight Cards */}
                <div className="grid grid-cols-2 gap-4">
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

                {/* Supplements List */}
                <div className="glass-card p-4 rounded-xl border border-glass-border">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-white flex items-center gap-2">
                            <Battery className="w-4 h-4 text-purple-400" /> Daily Supplements
                        </h3>
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="bg-white/10 hover:bg-white/15 text-white flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
                        >
                            <Plus className="w-3.5 h-3.5" /> Add
                        </button>
                    </div>

                    {isSupplementsLoading ? (
                        <p className="text-xs text-gray-500">Loading supplements...</p>
                    ) : supplements?.length === 0 ? (
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="w-full text-center py-6 border border-dashed border-white/10 hover:border-white/20 hover:bg-white/5 rounded-lg transition-colors group flex flex-col items-center justify-center gap-2"
                        >
                            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Plus className="w-5 h-5 text-gray-400" />
                            </div>
                            <p className="text-sm text-gray-400 tracking-wide font-medium group-hover:text-white transition-colors">Tap to add your first supplement</p>
                        </button>
                    ) : (
                        <div className="space-y-4">
                            {morningSupplements.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Morning</h4>
                                    {morningSupplements.map(renderSupplementItem)}
                                </div>
                            )}
                            {noonSupplements.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 mt-4">Noon</h4>
                                    {noonSupplements.map(renderSupplementItem)}
                                </div>
                            )}
                            {eveningSupplements.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 mt-4">Evening</h4>
                                    {eveningSupplements.map(renderSupplementItem)}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Food Logging Section */}
                <div className="glass-card p-4 rounded-xl border border-glass-border">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="font-semibold text-white">Food & Calories</h3>
                            <p className="text-xs text-gray-400 mt-1">Log your daily nutrition</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => setIsScannerOpen(true)}
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
                    </div>
                </div>
            </div>

            <AddSupplementModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
            />

            <HealthTrendModal
                isOpen={activeTrendMetric !== null}
                onClose={() => setActiveTrendMetric(null)}
                metric={activeTrendMetric}
            />

            <BarcodeScannerModal
                isOpen={isScannerOpen}
                onClose={() => setIsScannerOpen(false)}
                onScan={handleBarcodeScanned}
            />

            <ManualFoodEntryModal
                isOpen={isManualEntryOpen}
                onClose={() => setIsManualEntryOpen(false)}
            />
        </div>
    );
}
