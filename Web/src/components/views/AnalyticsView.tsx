'use client';

import { memo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import {
    LineChart, Line, AreaChart, Area,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
    PieChart, Pie, Cell
} from 'recharts';
import RacePredictionChart from '@/components/RacePredictionChart';
import CombinedAnalyticsChart, { TimeRange } from '@/components/CombinedAnalyticsChart';
import { Footer } from '@/components';
import { formatTime, formatPace } from '@/lib/metrics/vdot';

interface AnalyticsViewProps {
    runalyzeMetrics: {
        effectiveVO2max: number;
        rawVO2max: number;
        vdotCorrectionFactor: number;
        shape: number;
        mileageScore: number;
        longRunScore: number;
        crossTrainingScore: number;
        details: any;
        optimalTime: number;
        predictedTime: number;
        calibrationFactor: number;
    };
    vo2TrendData: any[];
    shapeTrendData: any[];
    fitnessData: any[];
    combinedData: any[];
    trainingPaces: any;
    userData: any;
    activitiesData: any;
    timeRange: TimeRange;
    zonesTimeRange: '1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL';
    setTimeRange: (range: TimeRange) => void;
    setZonesTimeRange: (range: '1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL') => void;
    onRecalculate: () => void;
    isRecalculating: boolean;
    onOpenCalibration: () => void;
    showHeader?: boolean;
}

export function AnalyticsView({
    runalyzeMetrics,
    vo2TrendData,
    shapeTrendData,
    fitnessData,
    combinedData,
    trainingPaces,
    userData,
    activitiesData,
    timeRange,
    zonesTimeRange,
    setTimeRange,
    setZonesTimeRange,
    onRecalculate,
    isRecalculating,
    onOpenCalibration,
    showHeader = true,
}: AnalyticsViewProps) {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-background">
            {showHeader && (
                <header className="border-b border-glass-border backdrop-blur-md bg-background/80 sticky top-0 z-50 pt-[env(safe-area-inset-top)]">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between h-16">
                            <div className="flex items-center gap-4">
                                <button onClick={() => router.push('/')} className="p-2 text-foreground-muted hover:text-foreground transition-colors">
                                    <ArrowLeft className="w-5 h-5" />
                                </button>
                                <h1 className="text-xl font-bold text-foreground">Performance Analytics</h1>
                            </div>
                            <button
                                onClick={onRecalculate}
                                disabled={isRecalculating}
                                className="btn-secondary flex items-center gap-2 py-2 px-4"
                            >
                                <RefreshCw className={`w-4 h-4 ${isRecalculating ? 'animate-spin' : ''}`} />
                                Refresh
                            </button>
                        </div>
                    </div>
                </header>
            )}

            {!showHeader && (
                <div className="px-4 pt-4 pb-2">
                    <h1 className="text-xl font-bold text-foreground">Analytics</h1>
                </div>
            )}

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                {/* TOP METRICS */}
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
                        </div>
                    </div>

                    {/* Predictions */}
                    <div className="glass-card p-6 text-center relative">
                        <button
                            onClick={onOpenCalibration}
                            className="absolute top-2 right-2 p-2 text-gray-500 hover:text-accent-pink transition"
                            title="Calibrate"
                        >
                            ⚙️
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
                                <p className="text-xs text-gray-500">Predicted</p>
                                <p className="text-2xl font-bold text-foreground">
                                    {runalyzeMetrics.predictedTime > 0 ? formatTime(runalyzeMetrics.predictedTime) : '-'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Combined Analytics Chart */}
                <CombinedAnalyticsChart
                    data={combinedData}
                    timeRange={timeRange}
                    onTimeRangeChange={setTimeRange}
                />

                {/* Race Prediction Chart */}
                <RacePredictionChart
                    effectiveVO2max={runalyzeMetrics.effectiveVO2max}
                    currentShape={runalyzeMetrics.shape}
                    calibrationFactor={runalyzeMetrics.calibrationFactor}
                />

                {/* Training Paces */}
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-foreground mb-4">Training Paces</h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
                            <p className="text-green-400 text-xs font-semibold mb-1 uppercase">Easy</p>
                            <p className="text-foreground font-bold text-lg">
                                {trainingPaces?.easy ? `${formatPace(trainingPaces.easy.min)} - ${formatPace(trainingPaces.easy.max)}` : '-'}
                            </p>
                        </div>
                        <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
                            <p className="text-blue-400 text-xs font-semibold mb-1 uppercase">Marathon</p>
                            <p className="text-foreground font-bold text-lg">
                                {trainingPaces?.marathon ? formatPace(trainingPaces.marathon) : '-'}
                            </p>
                        </div>
                        <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-center">
                            <p className="text-yellow-400 text-xs font-semibold mb-1 uppercase">Threshold</p>
                            <p className="text-foreground font-bold text-lg">
                                {trainingPaces?.threshold ? formatPace(trainingPaces.threshold) : '-'}
                            </p>
                        </div>
                        <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20 text-center">
                            <p className="text-orange-400 text-xs font-semibold mb-1 uppercase">Interval</p>
                            <p className="text-foreground font-bold text-lg">
                                {trainingPaces?.interval ? formatPace(trainingPaces.interval) : '-'}
                            </p>
                        </div>
                        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-center">
                            <p className="text-red-400 text-xs font-semibold mb-1 uppercase">Repetition</p>
                            <p className="text-foreground font-bold text-lg">
                                {trainingPaces?.repetition ? formatPace(trainingPaces.repetition) : '-'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Trend Charts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* VO2max Trend */}
                    <div className="glass-card p-6">
                        <h3 className="text-lg font-semibold text-foreground mb-4">VO2max Trend</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={vo2TrendData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" vertical={false} />
                                    <XAxis dataKey="date" stroke="var(--foreground-muted)" fontSize={11} tickLine={false} />
                                    <YAxis stroke="var(--foreground-muted)" fontSize={11} tickLine={false} domain={['auto', 'auto']} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '8px' }}
                                    />
                                    <Line type="monotone" dataKey="vo2Rolling" stroke="#f59e0b" strokeWidth={2} dot={false} name="VO2max" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Shape Trend */}
                    <div className="glass-card p-6">
                        <h3 className="text-lg font-semibold text-foreground mb-4">Shape Trend</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={shapeTrendData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" vertical={false} />
                                    <XAxis dataKey="week" stroke="var(--foreground-muted)" fontSize={11} tickLine={false} />
                                    <YAxis stroke="var(--foreground-muted)" fontSize={11} tickLine={false} domain={[0, 120]} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '8px' }}
                                    />
                                    <Area type="monotone" dataKey="shape" stroke="#10b981" fill="#10b981" fillOpacity={0.3} name="Shape %" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Fitness & Form */}
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-foreground mb-4">Fitness & Form</h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={fitnessData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" vertical={false} />
                                <XAxis dataKey="date" stroke="var(--foreground-muted)" fontSize={11} tickLine={false} />
                                <YAxis stroke="var(--foreground-muted)" fontSize={11} tickLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '8px' }}
                                />
                                <Legend />
                                <Line type="monotone" dataKey="ctl" stroke="#3b82f6" strokeWidth={2} dot={false} name="Fitness (CTL)" />
                                <Line type="monotone" dataKey="atl" stroke="#ef4444" strokeWidth={2} dot={false} name="Fatigue (ATL)" />
                                <Line type="monotone" dataKey="tsb" stroke="#10b981" strokeWidth={2} dot={false} name="Form (TSB)" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </main>

            {showHeader && <Footer />}
        </div>
    );
}

export default memo(AnalyticsView);
