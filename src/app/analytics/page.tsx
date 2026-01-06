'use client';

import { useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RefreshCw, Settings2 } from 'lucide-react';
import {
    LineChart, Line, AreaChart, Area, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import ShapeCalibrationModal from '@/components/ShapeCalibrationModal';
import RacePredictionChart from '@/components/RacePredictionChart';
import CombinedAnalyticsChart from '@/components/CombinedAnalyticsChart';
import {
    calculateWeightedEffectiveVO2max,
    calculateMarathonShape,
    calculatePredictedTimes,
    calculateAllRacePredictions,
    calculateEffectiveVO2max,
    type ActivityForShape
} from '@/lib/metrics/runalyze';
import { formatTime } from '@/lib/metrics/vdot';

export default function AnalyticsPage() {
    const { status } = useSession();
    const router = useRouter();
    const queryClient = useQueryClient();
    const [isCalibrationOpen, setIsCalibrationOpen] = useState(false);

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
            const res = await fetch('/api/user');
            if (!res.ok) throw new Error('Failed to fetch user');
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
    const { runalyzeMetrics, vo2TrendData, shapeTrendData, fitnessData, racePredictions, combinedData } = useMemo(() => {
        const activities = activitiesData?.activities || [];
        const runs: ActivityForShape[] = activities
            .filter((a: any) => a.type === 'RUN')
            .map((a: any) => ({
                startDate: a.startDate,
                distance: a.distance,
                movingTime: a.movingTime,
                averageHr: a.averageHr,
                hasHeartrate: a.hasHeartrate,
            }));

        const maxHR = userData?.user?.hrMax || 190;
        const activeGoal = goalsData?.goals?.find((g: any) => g.isActive);
        const calibrationFactor = activeGoal?.marathonShapeFactor || 1.0;

        // Use corrected effectiveVO2max from stats API (includes vdotCorrectionFactor)
        // Fall back to local calculation if stats not loaded
        const localVO2max = calculateWeightedEffectiveVO2max(runs, maxHR);
        const effectiveVO2max = statsData?.effectiveVO2max || localVO2max;

        const shapeResult = calculateMarathonShape(runs, effectiveVO2max);
        const times = calculatePredictedTimes(effectiveVO2max, shapeResult.shape, calibrationFactor);
        const allPredictions = calculateAllRacePredictions(effectiveVO2max, shapeResult.shape, calibrationFactor);

        // === VO2max Trend ===
        const vo2Trend: { date: string; vo2: number }[] = [];
        const sortedRuns = [...runs]
            .filter(r => r.hasHeartrate && r.averageHr && r.distance >= 3000)
            .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

        sortedRuns.slice(-50).forEach(run => {
            const vo2 = calculateEffectiveVO2max(run.distance, run.movingTime, run.averageHr!, maxHR);
            if (vo2 > 0) {
                vo2Trend.push({
                    date: new Date(run.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    vo2: Math.round(vo2 * 10) / 10
                });
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
                week: weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
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

        const startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        for (let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 1)) {
            const dateKey = d.toISOString().split('T')[0];
            const load = dailyLoads.get(dateKey) || 0;
            ctl = ctl + (load - ctl) / 42;
            atl = atl + (load - atl) / 7;
            const tsb = ctl - atl;

            if (d.getDay() === 0) { // Weekly sample
                fitness.push({
                    date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    ctl: Math.round(ctl),
                    atl: Math.round(atl),
                    tsb: Math.round(tsb)
                });
            }
        }

        // Build weekly volume map (km per week)
        const weeklyVolumeMap = new Map<string, number>();
        const weeklyTimeMap = new Map<string, number>();
        const weeklyVO2Map = new Map<string, number[]>(); // Store all VO2 values per week for averaging

        runs.forEach(run => {
            const date = new Date(run.startDate);
            const weekStart = new Date(date);
            const day = weekStart.getDay();
            weekStart.setDate(weekStart.getDate() - (day === 0 ? 6 : day - 1)); // Monday

            // Use Sunday as the key to match fitness data
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6); // Sunday
            const weekKey = weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            weeklyVolumeMap.set(weekKey, (weeklyVolumeMap.get(weekKey) || 0) + run.distance / 1000);
            weeklyTimeMap.set(weekKey, (weeklyTimeMap.get(weekKey) || 0) + run.movingTime / 60);

            // Calculate VO2max for this run if it has HR
            if (run.hasHeartrate && run.averageHr && run.distance >= 3000) {
                const vo2 = calculateEffectiveVO2max(run.distance, run.movingTime, run.averageHr, maxHR);
                if (vo2 > 0) {
                    const existing = weeklyVO2Map.get(weekKey) || [];
                    existing.push(vo2);
                    weeklyVO2Map.set(weekKey, existing);
                }
            }
        });

        // Build combined data for CombinedAnalyticsChart
        const combinedData = fitness.map(f => {
            const vo2Values = weeklyVO2Map.get(f.date) || [];
            const avgVO2 = vo2Values.length > 0
                ? Math.round(vo2Values.reduce((a, b) => a + b, 0) / vo2Values.length * 10) / 10
                : undefined;

            return {
                date: f.date,
                vo2max: avgVO2,
                ctl: f.ctl,
                atl: f.atl,
                tsb: f.tsb,
                volume: Math.round(weeklyVolumeMap.get(f.date) || 0),
                trainingTime: Math.round(weeklyTimeMap.get(f.date) || 0),
            };
        });

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
            combinedData
        };
    }, [activitiesData, userData, goalsData, statsData]);

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
            <header className="border-b border-white/10 backdrop-blur-md bg-background/80 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-4">
                            <button onClick={() => router.push('/')} className="p-2 text-gray-400 hover:text-white transition-colors">
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <h1 className="text-xl font-bold text-white">Performance Analytics</h1>
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
                        <p className="text-gray-400 text-sm mb-2">Effective VO2max</p>
                        <p className="text-4xl font-bold text-white">
                            {runalyzeMetrics.effectiveVO2max > 0 ? runalyzeMetrics.effectiveVO2max.toFixed(1) : '-'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">Pace + Heart Rate based</p>
                    </div>

                    {/* Marathon Shape */}
                    <div className="glass-card p-6 text-center">
                        <p className="text-gray-400 text-sm mb-2">Marathon Shape</p>
                        <p className={`text-4xl font-bold ${runalyzeMetrics.shape >= 100 ? 'text-green-400' :
                            runalyzeMetrics.shape >= 70 ? 'text-yellow-400' : 'text-red-400'
                            }`}>
                            {runalyzeMetrics.shape}%
                        </p>
                        <div className="flex justify-center gap-4 mt-2 text-xs text-gray-500">
                            <span>Mileage: {runalyzeMetrics.mileageScore}%</span>
                            <span>Long Runs: {runalyzeMetrics.longRunScore}%</span>
                            {runalyzeMetrics.crossTrainingScore > 0 && (
                                <span className="text-accent-blue">X-Train: {runalyzeMetrics.crossTrainingScore}%</span>
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
                                <p className="text-2xl font-bold text-white">
                                    {runalyzeMetrics.predictedTime > 0 ? formatTime(runalyzeMetrics.predictedTime) : '-'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* === RACE PREDICTIONS === */}
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Race Predictions</h3>
                    <div className="grid grid-cols-4 gap-4">
                        {racePredictions.map(p => (
                            <div key={p.distance} className="text-center p-4 bg-white/5 rounded-lg">
                                <p className="text-gray-400 text-sm mb-1">{p.distance}</p>
                                <p className="text-xl font-bold text-white">{formatTime(p.predicted)}</p>
                                <p className="text-xs text-gray-500">Optimal: {formatTime(p.optimal)}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Race Prediction Chart with Shape Slider */}
                <RacePredictionChart
                    effectiveVO2max={runalyzeMetrics.effectiveVO2max}
                    currentShape={runalyzeMetrics.shape}
                    calibrationFactor={runalyzeMetrics.calibrationFactor}
                />

                {/* Combined Analytics Chart */}
                <CombinedAnalyticsChart data={combinedData} />

                {/* === TREND CHARTS === */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* VO2max Trend */}
                    <div className="glass-card p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Effective VO2max Trend</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={vo2TrendData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                    <XAxis dataKey="date" stroke="#9ca3af" fontSize={11} tickLine={false} />
                                    <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} domain={['auto', 'auto']} />
                                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
                                    <Line type="monotone" dataKey="vo2" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 4 }} name="VO2max" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Shape Trend */}
                    <div className="glass-card p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Marathon Shape Trend</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={shapeTrendData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                    <XAxis dataKey="week" stroke="#9ca3af" fontSize={11} tickLine={false} />
                                    <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} domain={[0, 120]} />
                                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
                                    <Area type="monotone" dataKey="shape" stroke="#10b981" fill="#10b981" fillOpacity={0.3} name="Shape %" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* === FITNESS & FORM === */}
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Fitness & Form (CTL / ATL / TSB)</h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={fitnessData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                <XAxis dataKey="date" stroke="#9ca3af" fontSize={11} tickLine={false} />
                                <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
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
                            <p className="text-white font-semibold">{runalyzeMetrics.details.avgWeeklyKm} km</p>
                        </div>
                        <div>
                            <p className="text-gray-500">Target Weekly</p>
                            <p className="text-white font-semibold">{runalyzeMetrics.details.targetWeeklyKm} km</p>
                        </div>
                        <div>
                            <p className="text-gray-500">Long Run Points</p>
                            <p className="text-white font-semibold">{runalyzeMetrics.details.longRunPoints} / 10</p>
                        </div>
                        <div>
                            <p className="text-gray-500">Calibration</p>
                            <p className="text-white font-semibold">{runalyzeMetrics.calibrationFactor.toFixed(2)}x</p>
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
            />
        </div>
    );
}
