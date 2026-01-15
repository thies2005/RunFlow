'use client';

import { useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RefreshCw, Settings2 } from 'lucide-react';
import {
    LineChart, Line, AreaChart, Area, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
    PieChart, Pie, Cell
} from 'recharts';
import ShapeCalibrationModal from '@/components/ShapeCalibrationModal';
import RacePredictionChart from '@/components/RacePredictionChart';
import CombinedAnalyticsChart, { TimeRange } from '@/components/CombinedAnalyticsChart';
import { Footer } from '@/components';
import {
    calculateWeightedEffectiveVO2max,
    calculateMarathonShape,
    calculatePredictedTimes,
    calculateAllRacePredictions,
    calculateEffectiveVO2max,
    type ActivityForShape
} from '@/lib/metrics/runalyze';
import {
    formatTime,
    calculateTrainingPaces,
    formatPace,
    type TrainingPaces
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

    // Fetch analytics stats for VDOT correction factor
    const { data: statsData } = useQuery({
        queryKey: ['analytics-stats'],
        queryFn: async () => {
            const res = await fetch('/api/analytics/stats');
            if (!res.ok) throw new Error('Failed to fetch stats');
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

    // Calculated data
    const { runalyzeMetrics, vo2TrendData, shapeTrendData, fitnessData, racePredictions, combinedData, trainingPaces } = useMemo(() => {
        const activities: Activity[] = activitiesData?.activities || [];
        const runs: ActivityForShape[] = activities
            .filter((a: Activity) => a.type === 'RUN')
            .map((a: Activity) => ({
                startDate: a.startDate,
                distance: a.distance,
                movingTime: a.movingTime,
                averageHr: a.averageHr,
                hasHeartrate: a.hasHeartrate,
            }));

        // Include cross-training activities for shape calculation (matches start page)
        const crossTrainingActivities: ActivityForShape[] = activities
            .filter((a: Activity) => ['RIDE', 'VIRTUAL_RIDE', 'SWIM', 'WORKOUT'].includes(a.type))
            .map((a: Activity) => ({
                startDate: a.startDate,
                distance: a.distance,
                movingTime: a.movingTime,
                averageHr: a.averageHr,
                hasHeartrate: a.hasHeartrate,
                type: a.type,
                hrZone2Time: a.hrZone2Time ?? undefined,
                hrZone3Time: a.hrZone3Time ?? undefined,
                hrZone4Time: a.hrZone4Time ?? undefined,
            }));

        const maxHR = userData?.user?.hrMax || 190;
        const activeGoal = goalsData?.goals?.find((g: Goal) => g.isActive);
        const calibrationFactor = activeGoal?.marathonShapeFactor || 1.0;

        // Use corrected effectiveVO2max from stats API (includes vdotCorrectionFactor)
        // Fall back to local calculation if stats not loaded
        const localVO2max = calculateWeightedEffectiveVO2max(runs, maxHR);
        const effectiveVO2max = statsData?.effectiveVO2max || localVO2max;

        // Include cross-training activities for consistent shape calculation with start page
        const localShapeResult = calculateMarathonShape(runs, effectiveVO2max, crossTrainingActivities);
        // Use server-provided shape if available (unified metric), otherwise fallback to local
        const shapeResult = statsData?.marathonShape || localShapeResult;
        const times = calculatePredictedTimes(effectiveVO2max, shapeResult.shape, calibrationFactor);
        const allPredictions = calculateAllRacePredictions(effectiveVO2max, shapeResult.shape, calibrationFactor);
        const trainingPaces = calculateTrainingPaces(effectiveVO2max);

        // === VO2max Trend (with Rolling Average) ===
        const vo2Trend: { date: string; vo2: number; vo2Rolling?: number }[] = [];
        const sortedRuns = [...runs]
            .filter(r => r.hasHeartrate && r.averageHr && r.distance >= 3000)
            .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

        const factor = statsData?.vdotCorrectionFactor || 1.0;

        // Calculate raw values first
        const rawVo2Data = sortedRuns.slice(-50).map(run => {
            const rawVo2 = calculateEffectiveVO2max(run.distance, run.movingTime, run.averageHr!, maxHR);
            // Apply global calibration factor to trend points
            const vo2 = rawVo2 * factor;
            return {
                date: new Date(run.startDate).toISOString().split('T')[0], // Use ISO date for sorting
                vo2: vo2 > 0 ? Math.round(vo2 * 10) / 10 : 0
            };
        }).filter(d => d.vo2 > 0);

        // Calculate rolling median
        rawVo2Data.forEach((point, index) => {
            const windowSize = 4;
            const windowValues: number[] = [];

            for (let i = index; i >= 0 && windowValues.length < windowSize; i--) {
                windowValues.push(rawVo2Data[i].vo2);
            }

            if (windowValues.length > 0) {
                // Calculate Median
                windowValues.sort((a, b) => a - b);
                const mid = Math.floor(windowValues.length / 2);
                const median = windowValues.length % 2 !== 0
                    ? windowValues[mid]
                    : (windowValues[mid - 1] + windowValues[mid]) / 2;

                vo2Trend.push({
                    ...point,
                    vo2Rolling: Math.round(median * 10) / 10
                });
            } else {
                vo2Trend.push(point);
            }
        });

        // === Shape Trend (Weekly) ===
        const shapeTrend: { week: string; shape: number }[] = [];
        const now = new Date();
        for (let i = 11; i >= 0; i--) {
            const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
            const weekStart = new Date(weekEnd.getTime() - 182 * 24 * 60 * 60 * 1000);
            const weekRuns = runs.filter(r => {
                const d = new Date(r.startDate);
                return d >= weekStart && d <= weekEnd;
            });
            const tempVO2 = calculateWeightedEffectiveVO2max(weekRuns, maxHR);
            const tempShape = calculateMarathonShape(weekRuns, tempVO2 || effectiveVO2max);
            shapeTrend.push({
                week: weekEnd.toISOString().split('T')[0], // ISO Date
                shape: tempShape.shape
            });
        }

        // === CTL/ATL/TSB (Fitness & Form) ===
        const fitness: { date: string; ctl: number; atl: number; tsb: number }[] = [];
        let ctl = 0, atl = 0;
        const dailyLoads: Map<string, number> = new Map();

        runs.forEach(run => {
            const dateKey = new Date(run.startDate).toISOString().split('T')[0];
            const trimp = run.movingTime / 60; // Simplified TRIMP
            dailyLoads.set(dateKey, (dailyLoads.get(dateKey) || 0) + trimp);
        });

        const earliestRun = runs.length > 0
            ? runs.reduce((min, r) => new Date(r.startDate) < new Date(min.startDate) ? r : min)
            : null;
        const earliestDate = earliestRun ? new Date(earliestRun.startDate) : now;
        const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

        // Start from earliest activity or 1 year ago, whichever is earlier
        // ensuring we have coverage for the 1Y chart view
        const startDate = new Date(Math.min(earliestDate.getTime(), oneYearAgo.getTime()));
        // Buffer a few days for initial values
        startDate.setDate(startDate.getDate() - 1);
        for (let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 1)) {
            const dateKey = d.toISOString().split('T')[0];
            const load = dailyLoads.get(dateKey) || 0;
            ctl = ctl + (load - ctl) / 42;
            atl = atl + (load - atl) / 7;
            const tsb = ctl - atl;

            fitness.push({
                date: dateKey,
                ctl: Math.round(ctl),
                atl: Math.round(atl),
                tsb: Math.round(tsb)
            });
        }

        // Build daily volume map (km per day)
        const dailyVolumeMap = new Map<string, number>();
        const dailyTimeMap = new Map<string, number>();
        const dailyVO2Map = new Map<string, { values: number[]; vo2max?: number }>();

        activities.forEach(activity => {
            const dateKey = new Date(activity.startDate).toISOString().split('T')[0];

            // Always add to Training Time (minutes) - All Activity Types
            const minutes = activity.movingTime / 60;
            dailyTimeMap.set(dateKey, (dailyTimeMap.get(dateKey) || 0) + minutes);

            // Run-specific metrics (Volume, VO2)
            if (activity.type === 'RUN') {
                dailyVolumeMap.set(dateKey, (dailyVolumeMap.get(dateKey) || 0) + activity.distance / 1000);

                // Calculate VO2max for this run if it has HR
                if (activity.hasHeartrate && activity.averageHr && activity.distance >= 3000) {
                    const vo2 = calculateEffectiveVO2max(activity.distance, activity.movingTime, activity.averageHr, maxHR);
                    if (vo2 > 0) {
                        const existing = dailyVO2Map.get(dateKey) || { values: [] };
                        existing.values.push(vo2);
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

        // Create fitness map for easy lookup
        const fitnessDataMap = new Map(fitness.map(f => [f.date, f]));

        // 3. Create combined data array (Daily)
        const allDayKeys = new Set<string>();
        dailyVO2Map.forEach((_, key) => allDayKeys.add(key));
        fitnessDataMap.forEach((_, key) => allDayKeys.add(key));
        dailyVolumeMap.forEach((_, key) => allDayKeys.add(key));
        dailyTimeMap.forEach((_, key) => allDayKeys.add(key));

        const days = Array.from(allDayKeys).sort((a, b) => {
            const dateA = new Date(a);
            const dateB = new Date(b);
            return dateA.getTime() - dateB.getTime();
        });

        const initialCombinedData = days.map(day => {
            const vo2Entry = dailyVO2Map.get(day);
            const fitnessEntry = fitnessDataMap.get(day);
            const volumeEntry = dailyVolumeMap.get(day);
            const timeEntry = dailyTimeMap.get(day);

            return {
                date: day,
                vo2max: vo2Entry?.vo2max,
                ctl: fitnessEntry?.ctl,
                atl: fitnessEntry?.atl,
                tsb: fitnessEntry?.tsb,
                volume: volumeEntry ? Math.round(volumeEntry * 10) / 10 : 0,
                trainingTime: Math.round(timeEntry || 0),
            };
        });

        // 4. Calculate Rolling Averages
        const combinedDataWithRolling = initialCombinedData.map((d, index) => {
            // VO2max Rolling (28 days)
            const vo2Window = 28;
            let vo2Count = 0;
            let vo2Sum = 0;

            for (let i = index; i >= 0 && vo2Count < 10; i--) { // Limit to 10 actual VO2max readings back
                if (initialCombinedData[i].vo2max !== undefined) {
                    vo2Sum += initialCombinedData[i].vo2max!;
                    vo2Count++;
                }
            }

            // Volume & Time Rolling (7 days sum = "Weekly" equivalent)
            const weeklyWindow = 7;
            let volSum = 0;
            let timeSum = 0;

            // Look back 6 days + current day
            for (let i = index; i >= 0 && i > index - weeklyWindow; i--) {
                volSum += initialCombinedData[i].volume || 0;
                timeSum += initialCombinedData[i].trainingTime || 0;
            }

            return {
                ...d,
                vo2maxRolling: vo2Count > 0 ? Math.round(vo2Sum / vo2Count * 10) / 10 : undefined,
                volumeRolling: Math.round(volSum * 10) / 10,
                trainingTimeRolling: Math.round(timeSum)
            };
        });

        // 5. Calculate Zone Distribution from activities
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
                rawVO2max: statsData?.rawVO2max || localVO2max,
                vdotCorrectionFactor: statsData?.vdotCorrectionFactor || 1.0,
                shape: shapeResult.shape,
                mileageScore: shapeResult.mileageScore,
                longRunScore: shapeResult.longRunScore,
                crossTrainingScore: shapeResult.crossTrainingScore || 0,
                details: shapeResult.details,
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
    }, [activitiesData, userData, goalsData, statsData]);

    // Apply filtering to the data used in stand-alone charts
    const filteredVo2Trend = useMemo(() => filterByTimeRange(vo2TrendData, timeRange), [vo2TrendData, timeRange]);
    const filteredShapeTrend = useMemo(() => filterByTimeRange(shapeTrendData, timeRange), [shapeTrendData, timeRange]);
    const filteredFitness = useMemo(() => filterByTimeRange(fitnessData, timeRange), [fitnessData, timeRange]);

    if (status === 'loading' || isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="animate-pulse text-gray-400">Loading analytics...</div>
            </div>
        );
    }

    if (status === 'unauthenticated') {
        router.push('/login');
        return null;
    }

    return (
        <div className="min-h-screen bg-background">
            <header className="border-b border-glass-border backdrop-blur-md bg-background/80 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-4">
                            <button onClick={() => router.push('/')} className="p-2 text-foreground-muted hover:text-foreground transition-colors">
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <h1 className="text-xl font-bold text-foreground">Performance Analytics</h1>
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
                {/* === TOP METRICS === */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Effective VO2max */}
                    <div className="glass-card p-6 text-center">
                        <p className="text-foreground-muted text-sm mb-2">Effective VO2max</p>
                        <p className="text-4xl font-bold text-foreground">
                            {runalyzeMetrics.effectiveVO2max > 0 ? runalyzeMetrics.effectiveVO2max.toFixed(1) : '-'}
                        </p>
                        <p className="text-xs text-foreground-muted mt-1">Pace + Heart Rate based</p>
                    </div>

                    {/* Marathon Shape */}
                    <div className="glass-card p-6 text-center">
                        <p className="text-foreground-muted text-sm mb-2">Marathon Shape</p>
                        <p className={`text-4xl font-bold ${runalyzeMetrics.shape >= 100 ? 'text-green-400' :
                            runalyzeMetrics.shape >= 70 ? 'text-yellow-400' : 'text-red-400'
                            }`}>
                            {runalyzeMetrics.shape}%
                        </p>
                        <div className="flex justify-center gap-4 mt-2 text-xs text-foreground-muted">
                            <span>Mileage: {runalyzeMetrics.mileageScore}%</span>
                            <span>Long Runs: {runalyzeMetrics.longRunScore}%</span>
                            {runalyzeMetrics.crossTrainingScore > 0 && (
                                <span>X-Train: {runalyzeMetrics.crossTrainingScore}%</span>
                            )}
                        </div>
                    </div>

                    {/* Predictions */}
                    <div className="glass-card p-6 text-center relative">
                        <button
                            onClick={() => setIsCalibrationOpen(true)}
                            className="absolute top-2 right-2 p-2 text-gray-500 hover:text-accent-pink transition"
                            title="Calibrate"
                        >
                            <Settings2 className="w-4 h-4" />
                        </button>
                        <p className="text-gray-400 text-sm mb-2">Marathon Prediction</p>
                        <div className="flex justify-center items-baseline gap-3">
                            <div>
                                <p className="text-xs text-gray-500">Optimal</p>
                                <p className="text-lg font-semibold text-green-400">
                                    {runalyzeMetrics.optimalTime > 0 ? formatTime(runalyzeMetrics.optimalTime) : '-'}
                                </p>
                            </div>
                            <span className="text-gray-600">→</span>
                            <div>
                                <p className="text-xs text-gray-500 flex items-center justify-center gap-1">
                                    Predicted
                                    {runalyzeMetrics.calibrationFactor !== 1.0 && (
                                        <span className="text-accent-blue text-[10px] bg-accent-blue/10 px-1 rounded">
                                            {runalyzeMetrics.calibrationFactor.toFixed(2)}x
                                        </span>
                                    )}
                                </p>
                                <p className="text-2xl font-bold text-foreground">
                                    {runalyzeMetrics.predictedTime > 0 ? formatTime(runalyzeMetrics.predictedTime) : '-'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>


                {/* Combined Analytics Chart */}
                {/* Combined Analytics Chart */}
                <CombinedAnalyticsChart
                    data={combinedData}
                    timeRange={timeRange}
                    onTimeRangeChange={setTimeRange}
                />

                {/* Time in Zones Pie Chart */}
                {(() => {
                    // Filter activities by time range
                    const activities: Activity[] = activitiesData?.activities || [];
                    const now = new Date();
                    const cutoff = new Date();
                    switch (timeRange) {
                        case '1Y': cutoff.setFullYear(now.getFullYear() - 1); break;
                        case '6M': cutoff.setMonth(now.getMonth() - 6); break;
                        case '3M': cutoff.setMonth(now.getMonth() - 3); break;
                        case '1M': cutoff.setMonth(now.getMonth() - 1); break;
                        default: cutoff.setTime(0); // ALL
                    }

                    const filteredActivities = timeRange === 'ALL'
                        ? activities
                        : activities.filter(a => new Date(a.startDate) >= cutoff);

                    // Aggregate zone times
                    const zoneTotals = filteredActivities.reduce((acc, activity) => ({
                        Z1: acc.Z1 + (activity.hrZone1Time || 0),
                        Z2: acc.Z2 + (activity.hrZone2Time || 0),
                        Z3: acc.Z3 + (activity.hrZone3Time || 0),
                        Z4: acc.Z4 + (activity.hrZone4Time || 0),
                        Z5: acc.Z5 + (activity.hrZone5Time || 0),
                        Z6: acc.Z6 + (activity.hrZone6Time || 0),
                        Z7: acc.Z7 + (activity.hrZone7Time || 0),
                    }), { Z1: 0, Z2: 0, Z3: 0, Z4: 0, Z5: 0, Z6: 0, Z7: 0 });

                    const total = Object.values(zoneTotals).reduce((sum, v) => sum + v, 0);
                    if (total === 0) return null;

                    const pieData = [
                        { name: 'Z1 Recovery', value: zoneTotals.Z1, color: '#10b981' },
                        { name: 'Z2 Aerobic', value: zoneTotals.Z2, color: '#84cc16' },
                        { name: 'Z3 Tempo', value: zoneTotals.Z3, color: '#eab308' },
                        { name: 'Z4 Threshold', value: zoneTotals.Z4, color: '#f97316' },
                        { name: 'Z5 VO2max', value: zoneTotals.Z5, color: '#ef4444' },
                        { name: 'Z6 Anaerobic', value: zoneTotals.Z6, color: '#6366f1' },
                        { name: 'Z7 Neuromuscular', value: zoneTotals.Z7, color: '#9333ea' },
                    ].filter(d => d.value > 0);

                    const formatZoneTime = (seconds: number) => {
                        const hours = Math.floor(seconds / 3600);
                        const mins = Math.floor((seconds % 3600) / 60);
                        if (hours > 0) {
                            return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
                        }
                        return `${mins}m`;
                    };

                    return (
                        <div className="glass-card p-6">
                            <h3 className="text-lg font-semibold text-foreground mb-4">Time in Zones Distribution</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Pie Chart */}
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={pieData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={50}
                                                outerRadius={90}
                                                paddingAngle={2}
                                                dataKey="value"
                                                label={({ percent }) => percent > 0.05 ? `${Math.round(percent * 100)}%` : ''}
                                                labelLine={false}
                                            >
                                                {pieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{ backgroundColor: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '8px' }}
                                                formatter={(value: number) => formatZoneTime(value)}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* Legend & Breakdown */}
                                <div className="flex flex-col justify-center space-y-2">
                                    {pieData.map((zone, i) => {
                                        const pct = (zone.value / total) * 100;
                                        return (
                                            <div key={i} className="flex items-center justify-between p-2 hover:bg-white/5 rounded">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: zone.color }} />
                                                    <span className="text-foreground-muted text-sm">{zone.name}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-foreground font-mono text-sm">{formatZoneTime(zone.value)}</span>
                                                    <span className="text-foreground-muted text-xs w-12 text-right">{Math.round(pct)}%</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div className="border-t border-glass-border pt-2 mt-2 flex justify-between">
                                        <span className="text-foreground-muted text-sm">Total</span>
                                        <span className="text-foreground font-mono text-sm">{formatZoneTime(total)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })()}
                {/* Race Prediction Chart with Shape Slider */}
                <RacePredictionChart
                    effectiveVO2max={runalyzeMetrics.effectiveVO2max}
                    currentShape={runalyzeMetrics.shape}
                    calibrationFactor={runalyzeMetrics.calibrationFactor}
                />

                {/* Training Paces & Heart Rate Section */}
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-foreground mb-4">Training Paces & Heart Rate</h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {/* Easy */}
                        <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
                            <p className="text-green-400 text-xs font-semibold mb-1 uppercase tracking-wider">Easy (E)</p>
                            <p className="text-foreground font-bold text-lg">
                                {runalyzeMetrics.effectiveVO2max > 0
                                    ? `${formatPace(trainingPaces?.easy.min || 0)} - ${formatPace(trainingPaces?.easy.max || 0)}`
                                    : '-'}
                            </p>
                            <p className="text-green-300 text-sm mt-1">
                                {userData?.user?.hrMax ? `${Math.round(userData.user.hrMax * 0.65)}-${Math.round(userData.user.hrMax * 0.79)} bpm` : '-'}
                            </p>
                            <p className="text-[10px] text-foreground-muted mt-0.5">65-79% HRmax</p>
                        </div>

                        {/* Marathon */}
                        <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
                            <p className="text-blue-400 text-xs font-semibold mb-1 uppercase tracking-wider">Marathon (M)</p>
                            <p className="text-foreground font-bold text-lg">
                                {runalyzeMetrics.effectiveVO2max > 0 ? formatPace(trainingPaces?.marathon || 0) : '-'}
                            </p>
                            <p className="text-blue-300 text-sm mt-1">
                                {userData?.user?.hrMax ? `${Math.round(userData.user.hrMax * 0.78)}-${Math.round(userData.user.hrMax * 0.82)} bpm` : '-'}
                            </p>
                            <p className="text-[10px] text-foreground-muted mt-0.5">78-82% HRmax</p>
                        </div>

                        {/* Threshold */}
                        <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-center">
                            <p className="text-yellow-400 text-xs font-semibold mb-1 uppercase tracking-wider">Threshold (T)</p>
                            <p className="text-foreground font-bold text-lg">
                                {runalyzeMetrics.effectiveVO2max > 0 ? formatPace(trainingPaces?.threshold || 0) : '-'}
                            </p>
                            <p className="text-yellow-300 text-sm mt-1">
                                {userData?.user?.hrMax ? `${Math.round(userData.user.hrMax * 0.88)}-${Math.round(userData.user.hrMax * 0.92)} bpm` : '-'}
                            </p>
                            <p className="text-[10px] text-foreground-muted mt-0.5">88-92% HRmax</p>
                        </div>

                        {/* Interval */}
                        <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20 text-center">
                            <p className="text-orange-400 text-xs font-semibold mb-1 uppercase tracking-wider">Interval (I)</p>
                            <p className="text-foreground font-bold text-lg">
                                {runalyzeMetrics.effectiveVO2max > 0 ? formatPace(trainingPaces?.interval || 0) : '-'}
                            </p>
                            <p className="text-orange-300 text-sm mt-1">
                                {userData?.user?.hrMax ? `${Math.round(userData.user.hrMax * 0.98)}-${Math.round(userData.user.hrMax * 1.0)} bpm` : '-'}
                            </p>
                            <p className="text-[10px] text-foreground-muted mt-0.5">98-100% HRmax</p>
                        </div>

                        {/* Repetition */}
                        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-center">
                            <p className="text-red-400 text-xs font-semibold mb-1 uppercase tracking-wider">Repetition (R)</p>
                            <p className="text-foreground font-bold text-lg">
                                {runalyzeMetrics.effectiveVO2max > 0 ? formatPace(trainingPaces?.repetition || 0) : '-'}
                            </p>
                            <p className="text-red-300 text-sm mt-1">
                                {userData?.user?.hrMax ? `>${Math.round(userData.user.hrMax * 1.0)} bpm` : '-'}
                            </p>
                            <p className="text-[10px] text-foreground-muted mt-0.5">100%+ HRmax</p>
                        </div>
                    </div>
                </div>

                {/* === TREND CHARTS === */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* VO2max Trend (Rolling Average) */}
                    <div className="glass-card p-6">
                        <h3 className="text-lg font-semibold text-foreground mb-4">Effective VO2max Trend</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={filteredVo2Trend}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" vertical={false} />
                                    <XAxis
                                        dataKey="date"
                                        stroke="var(--foreground-muted)"
                                        fontSize={11}
                                        tickLine={false}
                                        minTickGap={timeRange === '1M' ? 20 : 50}
                                        tickFormatter={(val) => {
                                            const date = new Date(val);
                                            if (timeRange === '1M') {
                                                return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
                                            } else if (['3M', '6M'].includes(timeRange)) {
                                                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                            } else {
                                                return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                                            }
                                        }}
                                    />
                                    <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} domain={['auto', 'auto']} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '8px', backdropFilter: 'blur(12px)' }}
                                        labelStyle={{ color: 'var(--foreground)' }}
                                        itemStyle={{ color: 'var(--foreground)' }}
                                        labelFormatter={(val) => new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="vo2"
                                        stroke="none"
                                        dot={{ r: 3, fill: '#3b82f6', fillOpacity: 0.4 }}
                                        name="VO2max (Run)"
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="vo2Rolling"
                                        stroke="#3b82f6"
                                        strokeWidth={2}
                                        dot={false}
                                        name="Trend (Median)"
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Shape Trend */}
                    <div className="glass-card p-6">
                        <h3 className="text-lg font-semibold text-foreground mb-4">Marathon Shape Trend</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={filteredShapeTrend}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                    <XAxis
                                        dataKey="week"
                                        stroke="#9ca3af"
                                        fontSize={11}
                                        tickLine={false}
                                        minTickGap={timeRange === '1M' ? 20 : 50}
                                        tickFormatter={(val) => {
                                            const date = new Date(val);
                                            if (timeRange === '1M') {
                                                return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
                                            } else if (['3M', '6M'].includes(timeRange)) {
                                                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                            } else {
                                                return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                                            }
                                        }}
                                    />
                                    <YAxis stroke="var(--foreground-muted)" fontSize={11} tickLine={false} domain={[0, 120]} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '8px', backdropFilter: 'blur(12px)' }}
                                        labelStyle={{ color: 'var(--foreground)' }}
                                        itemStyle={{ color: 'var(--foreground)' }}
                                        labelFormatter={(val) => new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    />
                                    <Area type="monotone" dataKey="shape" stroke="#10b981" fill="#10b981" fillOpacity={0.3} name="Shape %" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* === FITNESS & FORM === */}
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-foreground mb-4">Fitness & Form (CTL / ATL / TSB)</h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={filteredFitness}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    stroke="var(--foreground-muted)"
                                    fontSize={11}
                                    tickLine={false}
                                    minTickGap={timeRange === '1M' ? 20 : 50}
                                    tickFormatter={(val) => {
                                        const date = new Date(val);
                                        if (timeRange === '1M') {
                                            return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
                                        } else if (['3M', '6M'].includes(timeRange)) {
                                            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                        } else {
                                            return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                                        }
                                    }}
                                />
                                <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '8px', backdropFilter: 'blur(12px)' }}
                                    labelStyle={{ color: 'var(--foreground)' }}
                                    itemStyle={{ color: 'var(--foreground)' }}
                                    labelFormatter={(val) => new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                />
                                <Legend />
                                <Line type="monotone" dataKey="ctl" stroke="#3b82f6" strokeWidth={2} dot={false} name="Fitness (CTL)" />
                                <Line type="monotone" dataKey="atl" stroke="#ef4444" strokeWidth={2} dot={false} name="Fatigue (ATL)" />
                                <Line type="monotone" dataKey="tsb" stroke="#10b981" strokeWidth={2} dot={false} name="Form (TSB)" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                    <p className="text-xs text-gray-500 mt-4 text-center">
                        CTL = Long-term fitness • ATL = Short-term fatigue • TSB = Form (CTL - ATL)
                    </p>
                </div>

                {/* Shape Details */}
                <div className="glass-card p-4">
                    <div className="grid grid-cols-4 gap-4 text-center text-sm">
                        <div>
                            <p className="text-gray-500">Avg Weekly</p>
                            <p className="text-foreground font-semibold">{runalyzeMetrics.details.avgWeeklyKm} km</p>
                        </div>
                        <div>
                            <p className="text-gray-500">Target Weekly</p>
                            <p className="text-foreground font-semibold">{runalyzeMetrics.details.targetWeeklyKm} km</p>
                        </div>
                        <div>
                            <p className="text-gray-500">Long Run Points</p>
                            <p className="text-foreground font-semibold">{runalyzeMetrics.details.longRunPoints} / 10</p>
                        </div>
                        <div>
                            <p className="text-gray-500">Calibration</p>
                            <p className="text-foreground font-semibold">{runalyzeMetrics.calibrationFactor.toFixed(2)}x</p>
                        </div>
                    </div>
                </div>
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
