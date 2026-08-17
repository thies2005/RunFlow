'use client';

import { useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RefreshCw, Heart } from 'lucide-react';
import dynamic from 'next/dynamic';
import type { TimeRange } from '@/components/CombinedAnalyticsChart';

// Dynamic imports for heavy chart components to enable lazy loading and reduce initial bundle size
const ShapeCalibrationModal = dynamic(() => import('@/components/ShapeCalibrationModal'), { ssr: false });
const RacePredictionChart = dynamic(() => import('@/components/RacePredictionChart'), { ssr: false });
const RacePredictionTimeChart = dynamic(() => import('@/components/RacePredictionTimeChart'), { ssr: false });
const CombinedAnalyticsChart = dynamic(() => import('@/components/CombinedAnalyticsChart'), { ssr: false });
const TrendChartsSection = dynamic(() => import('@/components/analytics/TrendChartsSection'), { ssr: false });
const ZoneDistributionSection = dynamic(() => import('@/components/analytics/ZoneDistributionSection'), { ssr: false });
const TopMetricsSection = dynamic(() => import('@/components/analytics/TopMetricsSection'), { ssr: false });
const TrainingPacesSection = dynamic(() => import('@/components/analytics/TrainingPacesSection'), { ssr: false });
const FitnessChart = dynamic(() => import('@/components/FitnessChart'), { ssr: false });
import { Footer } from '@/components';
import {
    calculatePredictedTimes,
    calculateAllRacePredictions,
    calculateEffectiveVO2max,
} from '@/lib/metrics/runalyze';
import {
    calculateTrainingPaces,
} from '@/lib/metrics/vdot';
import type { Activity, Goal } from '@/lib/types';

export default function AnalyticsPage() {
    const { status } = useSession();
    const router = useRouter();
    const queryClient = useQueryClient();
    const [isCalibrationOpen, setIsCalibrationOpen] = useState(false);
    const [timeRange, setTimeRange] = useState<TimeRange>('1Y');

    // Filter helpers
    const filterByTimeRange = <T extends { date?: string; week?: string }>(data: T[], range: TimeRange): T[] => {
        if (range === 'ALL' || !data.length) return data;
        const now = new Date();
        const cutoff = new Date();

        switch (range) {
            case '1Y': cutoff.setFullYear(now.getFullYear() - 1); break;
            case '6M': cutoff.setMonth(now.getMonth() - 6); break;
            case '3M': cutoff.setMonth(now.getMonth() - 3); break;
            case '1M': cutoff.setMonth(now.getMonth() - 1); break;
        }

        return data.filter(d => {
            const dateStr = d.date || d.week;
            if (!dateStr) return true;
            return new Date(dateStr) >= cutoff;
        });
    };

    // Fetch ALL activities
    const { data: activitiesData, isLoading } = useQuery({
        queryKey: ['all-activities'],
        queryFn: async () => {
            const res = await fetch('/api/activities?limit=500');
            if (!res.ok) throw new Error('Failed to fetch activities');
            return res.json();
        },
        enabled: status === 'authenticated',
    });

    // Fetch user settings (for maxHR)
    const { data: userData } = useQuery({
        queryKey: ['user-settings'],
        queryFn: async () => {
            const res = await fetch('/api/settings/update-vdot');
            if (!res.ok) throw new Error('Failed to fetch user settings');
            return res.json();
        },
        enabled: status === 'authenticated',
    });

    // Fetch active goal for calibration factor
    const { data: goalsData } = useQuery({
        queryKey: ['goals'],
        queryFn: async () => {
            const res = await fetch('/api/goals');
            if (!res.ok) throw new Error('Failed to fetch goals');
            return res.json();
        },
        enabled: status === 'authenticated',
    });

    // Fetch analytics stats for VDOT correction factor and current metrics
    const { data: statsData } = useQuery({
        queryKey: ['analytics-stats'],
        queryFn: async () => {
            const res = await fetch('/api/analytics/stats');
            if (!res.ok) throw new Error('Failed to fetch stats');
            return res.json();
        },
        enabled: status === 'authenticated',
    });

    // Fetch analytics history for server-calculated trends (shape, VO2, fitness)
    const { data: historyData } = useQuery({
        queryKey: ['analytics-history', timeRange],
        queryFn: async () => {
            const rangeMap: Record<string, string> = {
                'ALL': 'ALL',
                '1Y': '1_YEAR',
                '6M': '6_MONTHS',
                '3M': '12_WEEKS',
                '1M': '4_WEEKS'
            };
            const res = await fetch(`/api/analytics/history?range=${rangeMap[timeRange] || '1_YEAR'}`);
            if (!res.ok) throw new Error('Failed to fetch history');
            return res.json();
        },
        enabled: status === 'authenticated',
    });

    // Recalculate mutation
    const recalculateMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch('/api/settings/recalculate-vdot', { method: 'POST' });
            if (!res.ok) throw new Error('Failed to recalculate');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['all-activities'] });
        },
    });

    // Calculated data - uses server data where available, local calculations for derived values only
    const { runalyzeMetrics, vo2TrendData, shapeTrendData, fitnessData, combinedData, trainingPaces } = useMemo(() => {
        const activities: Activity[] = activitiesData?.activities || [];

        // Get values from server APIs
        const effectiveVO2max = statsData?.effectiveVO2max || 0;
        const activeGoal = goalsData?.goals?.find((g: Goal) => g.isActive);
        const calibrationFactor = activeGoal?.marathonShapeFactor || 1.0;

        // Use server-provided marathon shape
        const shapeFromServer = statsData?.marathonShape || { shape: 0, mileageScore: 0, longRunScore: 0, crossTrainingScore: 0, details: {} };

        // Calculate race predictions and training paces from server values
        const times = effectiveVO2max > 0
            ? calculatePredictedTimes(effectiveVO2max, shapeFromServer.shape, calibrationFactor)
            : { optimal: 0, predicted: 0 };
        const allPredictions = effectiveVO2max > 0
            ? calculateAllRacePredictions(effectiveVO2max, shapeFromServer.shape, calibrationFactor)
            : [];
        const trainingPaces = effectiveVO2max > 0
            ? calculateTrainingPaces(effectiveVO2max)
            : null;

        // Use server-provided trend data
        const serverShapeTrend = historyData?.shapeTrend || [];
        const shapeTrend: { week: string; shape: number }[] = serverShapeTrend.map((s: { week: string; shape: number }) => ({
            week: s.week,
            shape: s.shape
        }));

        // Use server-provided VO2 trend (weekly) with rolling average
        const serverVo2Trend = historyData?.vo2Trend || [];
        const vo2Trend: { date: string; vo2: number; vo2Rolling?: number }[] = [];
        serverVo2Trend.forEach((point: { week: string; vo2: number }, index: number) => {
            const windowSize = 4;
            const windowValues: number[] = [];
            for (let i = index; i >= 0 && windowValues.length < windowSize; i--) {
                windowValues.push(serverVo2Trend[i].vo2);
            }
            if (windowValues.length > 0) {
                const sum = windowValues.reduce((a, b) => a + b, 0);
                const avg = sum / windowValues.length;
                vo2Trend.push({
                    date: point.week,
                    vo2: point.vo2,
                    vo2Rolling: Math.round(avg * 10) / 10
                });
            } else {
                vo2Trend.push({ date: point.week, vo2: point.vo2 });
            }
        });

        // Use server-provided fitness trend
        const serverFitnessTrend = historyData?.fitnessTrend || [];
        const fitness: { date: string; ctl: number; atl: number; tsb: number }[] = serverFitnessTrend.map((f: { date: string; ctl: number; atl: number; tsb: number }) => ({
            date: f.date,
            ctl: f.ctl,
            atl: f.atl,
            tsb: f.tsb
        }));

        // === Combined Data for Charts (Volume + Training Time) - still local ===
        const dailyVolumeMap = new Map<string, number>();
        const dailyTimeMap = new Map<string, number>();
        const dailyVO2Map = new Map<string, { values: number[]; vo2max?: number }>();
        const maxHR = userData?.user?.hrMax || userData?.hrMax || 190;
        const factor = statsData?.vdotCorrectionFactor || 1.0;

        activities.forEach(activity => {
            const dateKey = new Date(activity.startDate).toISOString().split('T')[0];

            // Always add to Training Time (minutes) - All Activity Types
            const minutes = activity.movingTime / 60;
            dailyTimeMap.set(dateKey, (dailyTimeMap.get(dateKey) || 0) + minutes);

            // Run-specific metrics (Volume, VO2)
            if (activity.type === 'RUN') {
                dailyVolumeMap.set(dateKey, (dailyVolumeMap.get(dateKey) || 0) + activity.distance / 1000);

                // Calculate VO2max for this run if it has HR (for detailed daily trend)
                if (activity.hasHeartrate && activity.averageHr && activity.distance >= 3000) {
                    const vo2 = calculateEffectiveVO2max(activity.distance, activity.movingTime, activity.averageHr, maxHR);
                    if (vo2 > 0) {
                        const existing = dailyVO2Map.get(dateKey) || { values: [] };
                        existing.values.push(vo2 * factor);
                        dailyVO2Map.set(dateKey, existing);
                    }
                }
            }
        });

        // Calculate average VO2max for each day
        dailyVO2Map.forEach((entry) => {
            if (entry.values.length > 0) {
                entry.vo2max = Math.round(entry.values.reduce((a, b) => a + b, 0) / entry.values.length * 10) / 10;
            }
        });

        // Helper to safe-normalize dates (using string manipulation to avoid timezone issues)
        const normalizeDate = (d: string) => {
            if (!d) return '';
            // If it's already YYYY-MM-DD, return it. If it's ISO, take first 10 chars.
            return d.length >= 10 ? d.substring(0, 10) : d;
        };

        // Build combined data array - INCLUDE server fitness dates (for rest days)
        const fitnessDateSet = new Set<string>(serverFitnessTrend.map((f: { date: string }) => normalizeDate(f.date)));
        const allDates = new Set<string>([
            ...Array.from(dailyVolumeMap.keys()),
            ...Array.from(dailyTimeMap.keys()),
            ...Array.from(fitnessDateSet)  // Include server fitness dates (including rest days up to today)
        ]);
        const combinedDataRaw = Array.from(allDates).sort().map((date: string) => {
            // date is YYYY-MM-DD from dailyVolumeMap
            const fitnessEntry = serverFitnessTrend.find((f: { date: string }) => normalizeDate(f.date) === date);
            return {
                date,
                volume: dailyVolumeMap.get(date) || 0,
                trainingTime: dailyTimeMap.get(date) || 0,
                vo2max: dailyVO2Map.get(date)?.vo2max,
                ctl: fitnessEntry?.ctl,
                atl: fitnessEntry?.atl,
                tsb: fitnessEntry?.tsb,
            };
        });

        // Calculate rolling averages for combined data
        const combinedDataWithRolling = combinedDataRaw.map((d, index) => {
            const windowSize = 7;
            let volSum = 0, timeSum = 0, vo2Sum = 0, vo2Count = 0;

            for (let i = index; i >= 0 && index - i < windowSize; i--) {
                volSum += combinedDataRaw[i].volume;
                timeSum += combinedDataRaw[i].trainingTime;
                if (combinedDataRaw[i].vo2max) {
                    vo2Sum += combinedDataRaw[i].vo2max!;
                    vo2Count++;
                }
            }

            return {
                ...d,
                vo2maxRolling: vo2Count > 0 ? Math.round(vo2Sum / vo2Count * 10) / 10 : undefined,
                volumeRolling: Math.round(volSum * 10) / 10,
                trainingTimeRolling: Math.round(timeSum)
            };
        });

        // Zone distribution from activities
        const zoneDistribution = activities.reduce((acc: Record<string, number>, activity: Activity) => {
            acc.Z1 = (acc.Z1 || 0) + (activity.hrZone1Time || 0);
            acc.Z2 = (acc.Z2 || 0) + (activity.hrZone2Time || 0);
            acc.Z3 = (acc.Z3 || 0) + (activity.hrZone3Time || 0);
            acc.Z4 = (acc.Z4 || 0) + (activity.hrZone4Time || 0);
            acc.Z5 = (acc.Z5 || 0) + (activity.hrZone5Time || 0);
            acc.Z6 = (acc.Z6 || 0) + (activity.hrZone6Time || 0);
            acc.Z7 = (acc.Z7 || 0) + (activity.hrZone7Time || 0);
            return acc;
        }, {});

        return {
            runalyzeMetrics: {
                effectiveVO2max,
                rawVO2max: statsData?.rawVO2max || 0,
                vdotCorrectionFactor: statsData?.vdotCorrectionFactor || 1.0,
                shape: shapeFromServer.shape,
                mileageScore: shapeFromServer.mileageScore,
                longRunScore: shapeFromServer.longRunScore,
                crossTrainingScore: shapeFromServer.crossTrainingScore || 0,
                details: shapeFromServer.details,
                optimalTime: times.optimal,
                predictedTime: times.predicted,
                calibrationFactor
            },
            vo2TrendData: vo2Trend,
            shapeTrendData: shapeTrend,
            fitnessData: fitness,
            racePredictions: allPredictions,
            trainingPaces,
            combinedData: combinedDataWithRolling,
            zoneDistribution
        };
    }, [activitiesData, userData, goalsData, statsData, historyData]);

    // Apply filtering to the data used in stand-alone charts
    const filteredVo2Trend = useMemo(() => filterByTimeRange(vo2TrendData, timeRange), [vo2TrendData, timeRange]);
    const filteredShapeTrend = useMemo(() => filterByTimeRange(shapeTrendData, timeRange), [shapeTrendData, timeRange]);
    const filteredFitness = useMemo(() => filterByTimeRange(fitnessData, timeRange), [fitnessData, timeRange]);

    if (status === 'unauthenticated') {
        router.push('/login');
        return null;
    }

    const showLoading = status === 'loading' || isLoading;



    return (
        <div className="min-h-screen bg-background">
            <header className="border-b border-glass-border backdrop-blur-md bg-background/80 sticky top-0 z-50 pt-[env(safe-area-inset-top)]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-4">
                            <button onClick={() => router.push('/')} className="p-2 text-foreground-muted hover:text-foreground transition-colors">
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <h1 className="text-xl font-bold text-foreground">Performance Analytics</h1>
                            {userData?.healthTrackingEnabled && (
                                <button onClick={() => router.push('/health')} className="ml-4 btn-secondary text-foreground flex items-center gap-2 py-2 px-3 sm:px-4">
                                    <Heart className="w-5 h-5" />
                                    <span className="hidden sm:inline">Health</span>
                                </button>
                            )}
                        </div>
                        <button
                            onClick={() => recalculateMutation.mutate()}
                            disabled={recalculateMutation.isPending}
                            className="btn-secondary flex items-center gap-2 py-2 px-4"
                        >
                            <RefreshCw className={`w-4 h-4 ${recalculateMutation.isPending ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                {showLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-pulse text-foreground-muted">Loading analytics...</div>
                    </div>
                ) : (
                    <>
                        {/* === TOP METRICS === */}
                        <TopMetricsSection
                            runalyzeMetrics={runalyzeMetrics}
                            setIsCalibrationOpen={setIsCalibrationOpen}
                        />


                        {/* Combined Analytics Chart */}
                        {/* Combined Analytics Chart */}
                        <CombinedAnalyticsChart
                            data={combinedData}
                            timeRange={timeRange}
                            onTimeRangeChange={setTimeRange}
                        />

                        {/* Time in Zones Pie Chart */}
                        <ZoneDistributionSection
                            activities={activitiesData?.activities || []}
                            userData={userData}
                        />

                        {/* Race Prediction Chart with Shape Slider */}
                        <RacePredictionChart
                            effectiveVO2max={runalyzeMetrics.effectiveVO2max}
                            currentShape={runalyzeMetrics.shape}
                            calibrationFactor={runalyzeMetrics.calibrationFactor}
                        />

                        {/* Race Prediction Time Trends Chart */}
                        <RacePredictionTimeChart
                            vo2TrendData={vo2TrendData}
                            shapeTrendData={shapeTrendData}
                            calibrationFactor={runalyzeMetrics.calibrationFactor}
                        />

                        {/* Training Paces & Heart Rate Section */}
                        <TrainingPacesSection
                            effectiveVO2max={runalyzeMetrics.effectiveVO2max}
                            trainingPaces={trainingPaces}
                            maxHr={userData?.user?.hrMax || userData?.hrMax}
                        />

                        {/* === TREND CHARTS === */}
                        <TrendChartsSection
                            filteredVo2Trend={filteredVo2Trend}
                            filteredShapeTrend={filteredShapeTrend}
                            timeRange={timeRange}
                        />

                        {/* === FITNESS & FORM === */}
                        <FitnessChart data={filteredFitness} />

                        {/* Shape Details */}
                        <div className="glass-card p-4">
                            <div className="grid grid-cols-4 gap-4 text-center text-sm">
                                <div>
                                    <p className="text-foreground-muted">Avg Weekly</p>
                                    <p className="text-foreground font-semibold">{runalyzeMetrics.details.avgWeeklyKm} km</p>
                                </div>
                                <div>
                                    <p className="text-foreground-muted">Target Weekly</p>
                                    <p className="text-foreground font-semibold">{runalyzeMetrics.details.targetWeeklyKm} km</p>
                                </div>
                                <div>
                                    <p className="text-foreground-muted">Long Run Points</p>
                                    <p className="text-foreground font-semibold">{runalyzeMetrics.details.longRunPoints} / 10</p>
                                </div>
                                <div>
                                    <p className="text-foreground-muted">Calibration</p>
                                    <p className="text-foreground font-semibold">{runalyzeMetrics.calibrationFactor.toFixed(2)}x</p>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </main>

            {/* Calibration Modal */}
            <ShapeCalibrationModal
                isOpen={isCalibrationOpen}
                onClose={() => setIsCalibrationOpen(false)}
                currentFactor={runalyzeMetrics.calibrationFactor}
                effectiveVO2max={runalyzeMetrics.effectiveVO2max}
                rawVO2max={runalyzeMetrics.rawVO2max}
                vdotCorrectionFactor={runalyzeMetrics.vdotCorrectionFactor}
                shapePercent={runalyzeMetrics.shape}
                activities={activitiesData?.activities || []}
            />
            <Footer />
        </div>
    );
}
