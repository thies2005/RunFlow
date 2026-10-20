'use client';

import { memo, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RefreshCw, Settings, Activity as ActivityIcon, Zap, Layers, TrendingUp, ChevronRight } from 'lucide-react';
import {
    LineChart, Line, AreaChart, Area,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import RacePredictionChart from '@/components/RacePredictionChart';
import RacePredictionTimeChart from '@/components/RacePredictionTimeChart';
import CombinedAnalyticsChart, { TimeRange } from '@/components/CombinedAnalyticsChart';
import SplitPmcChart, { PmcRange } from '@/components/Analytics/SplitPmcChart';
import ZoneDistributionSection from '@/components/analytics/ZoneDistributionSection';
import CyclingAnalyticsSection from '@/components/Analytics/CyclingAnalyticsSection';
import { Footer } from '@/components';
import LazyChartWrapper from '@/components/LazyChartWrapper';
import { formatTime, formatPace } from '@/lib/metrics/vdot';

interface TooltipEntry {
    name?: string;
    value?: number;
    color?: string;
    stroke?: string;
    dataKey?: string;
}
interface AnalyticsTooltipProps {
    active?: boolean;
    payload?: TooltipEntry[];
    label?: string;
}
interface RunalyzeDetails {
    avgWeeklyKm: number;
    targetWeeklyKm: number;
    longRunPoints: number;
    targetPoints: number;
    crossTrainingMinutes?: number;
}
interface DataPoint {
    date: string;
    vo2max?: number;
    vo2maxRolling?: number;
    ctl?: number;
    atl?: number;
    tsb?: number;
    volume?: number;
    volumeRolling?: number;
    trainingTime?: number;
    trainingTimeRolling?: number;
}

interface VO2DataPoint {
    date?: string;
    week?: string;
    vo2: number;
    vo2Rolling?: number;
}
interface ShapeDataPoint {
    week: string;
    shape: number;
}
interface FitnessDataPoint { date: string; ctl?: number; atl?: number; tsb?: number }
interface TrainingPaces {
    easy: { min: number; max: number };
    marathon: number;
    threshold: number;
    interval: number;
    repetition: number;
}

type SelectedSport = 'COMBINED' | 'RUNNING' | 'CYCLING';

// Maps the page TimeRange to the equivalent PMC/cycling range
const timeRangeToPmcRange = (range: TimeRange): PmcRange =>
    range === '1M' ? '42d'
        : range === '3M' ? '90d'
            : range === '6M' ? '180d'
                : range === '1Y' ? '1y'
                    : 'all';

const AnalyticsTooltip = ({ active, payload, label }: AnalyticsTooltipProps) => {
    if (active && payload && payload.length) {
        return (
            <div className="glass-card p-4 border border-line">
                {label && (
                    <p className="text-foreground-muted text-sm mb-2">
                        {label}
                    </p>
                )}
                <div className="space-y-1">
                    {payload.map((entry: TooltipEntry, index: number) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                            <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: entry.color || entry.stroke }}
                            />
                            <span className="text-foreground-muted">{entry.name}:</span>
                            <span className="text-foreground font-medium font-mono tabular-nums">
                                {typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

interface AnalyticsViewProps {
    runalyzeMetrics: {
        effectiveVO2max: number;
        vdot: number;
        rawVO2max: number;
        vdotCorrectionFactor: number;
        shape: number;
        mileageScore: number;
        longRunScore: number;
        crossTrainingScore: number;
        details: RunalyzeDetails;
        optimalTime: number;
        predictedTime: number;
        calibrationFactor: number;
    };
    vo2TrendData: VO2DataPoint[];
    shapeTrendData: ShapeDataPoint[];
    fitnessData: FitnessDataPoint[];
    combinedData: DataPoint[];
    trainingPaces: TrainingPaces | null;
    userData: Record<string, unknown>;
    activitiesData: any;
    cyclingData?: any;
    timeRange: TimeRange;
    zonesTimeRange: '1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL';
    setTimeRange: (_range: TimeRange) => void;
    setZonesTimeRange: (_range: '1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL') => void;
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
    cyclingData,
    timeRange,
    zonesTimeRange: _zonesTimeRange,
    setTimeRange,
    setZonesTimeRange: _setZonesTimeRange,
    onRecalculate,
    isRecalculating,
    onOpenCalibration,
    showHeader = true,
}: AnalyticsViewProps) {
    const router = useRouter();
    const [selectedSport, setSelectedSport] = useState<SelectedSport>('COMBINED');

    const pmcRange = timeRangeToPmcRange(timeRange);

    // Combined multi-sport overview stats (mirrors desktop analytics page)
    const combinedSportStats = useMemo(() => {
        const activities: any[] = activitiesData?.activities || [];
        let runDistM = 0;
        let bikeDistM = 0;
        let totalMovingSec = 0;
        let runCount = 0;
        let bikeCount = 0;

        activities.forEach(a => {
            totalMovingSec += a.movingTime;
            if (a.type === 'RUN') {
                runDistM += a.distance;
                runCount++;
            } else if (a.type === 'RIDE' || a.type === 'VIRTUAL_RIDE') {
                bikeDistM += a.distance;
                bikeCount++;
            }
        });

        const latestPmc = cyclingData?.pmcSeries?.[cyclingData.pmcSeries.length - 1];
        const lastFitness = fitnessData?.[fitnessData.length - 1];

        return {
            runDistKm: (runDistM / 1000).toFixed(1),
            bikeDistKm: (bikeDistM / 1000).toFixed(1),
            totalHours: Math.round(totalMovingSec / 3600),
            totalActivities: activities.length,
            runCount,
            bikeCount,
            ctlCombined: latestPmc?.ctlCombined ?? lastFitness?.ctl ?? 0,
            atlCombined: latestPmc?.atlCombined ?? lastFitness?.atl ?? 0,
            tsbCombined: latestPmc?.tsbCombined ?? lastFitness?.tsb ?? 0,
        };
    }, [activitiesData, cyclingData, fitnessData]);

    return (
        <div className="min-h-screen bg-background">
            {showHeader && (
                <header className="topbar sticky top-0 z-50 pt-[env(safe-area-inset-top)]">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between h-16">
                            <div className="flex items-center gap-4">
                                <button onClick={() => router.push('/')} className="p-2 transition-colors">
                                    <ArrowLeft className="w-5 h-5" />
                                </button>
                                <h1 className="text-xl font-bold">Performance Analytics</h1>
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
                {/* === SPORT SELECTOR & RANGE BAR === */}
                <div className="flex flex-col gap-3 pb-2 border-b border-line">
                    <div className="inline-flex self-start rounded-lg bg-background-tertiary p-1 border border-line text-xs sm:text-sm">
                        <button
                            type="button"
                            onClick={() => setSelectedSport('COMBINED')}
                            className={`flex items-center gap-2 px-3 py-2 font-medium rounded-md transition-all ${
                                selectedSport === 'COMBINED'
                                    ? 'bg-accent-cyan text-background font-semibold shadow-xs'
                                    : 'text-foreground-muted hover:text-foreground'
                            }`}
                        >
                            <Layers className="w-4 h-4" />
                            Combined
                        </button>
                        {combinedSportStats.runCount > 0 && (
                            <button
                                type="button"
                                onClick={() => setSelectedSport('RUNNING')}
                                className={`flex items-center gap-2 px-3 py-2 font-medium rounded-md transition-all ${
                                    selectedSport === 'RUNNING'
                                        ? 'bg-accent-blue text-white font-semibold shadow-xs'
                                        : 'text-foreground-muted hover:text-foreground'
                                }`}
                            >
                                <ActivityIcon className="w-4 h-4" />
                                Running
                            </button>
                        )}
                        {combinedSportStats.bikeCount > 0 && (
                            <button
                                type="button"
                                onClick={() => setSelectedSport('CYCLING')}
                                className={`flex items-center gap-2 px-3 py-2 font-medium rounded-md transition-all ${
                                    selectedSport === 'CYCLING'
                                        ? 'bg-accent-orange text-white font-semibold shadow-xs'
                                        : 'text-foreground-muted hover:text-foreground'
                                }`}
                            >
                                <Zap className="w-4 h-4" />
                                Cycling
                            </button>
                        )}
                    </div>

                    {/* Range Selector */}
                    <div className="inline-flex self-start rounded-lg bg-background-tertiary p-1 border border-line text-xs">
                        {(['42d', '90d', '180d', '1y', 'all'] as const).map((r) => {
                            const mappedRange: TimeRange = r === '42d' ? '1M' : r === '90d' ? '3M' : r === '180d' ? '6M' : r === '1y' ? '1Y' : 'ALL';
                            const isActive = timeRange === mappedRange;
                            return (
                                <button
                                    key={r}
                                    type="button"
                                    onClick={() => setTimeRange(mappedRange)}
                                    className={`px-3 py-1.5 uppercase font-medium rounded-md transition-all ${
                                        isActive
                                            ? 'bg-surface-hover text-foreground font-semibold'
                                            : 'text-foreground-muted hover:text-foreground'
                                    }`}
                                >
                                    {r}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* === COMBINED SPORT VIEW === */}
                {selectedSport === 'COMBINED' && (
                    <div className="space-y-8 animate-fade-in">
                        {/* Combined KPI Strip (2x2 on mobile) */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="glass-card p-4">
                                <div className="text-xs text-foreground-muted mb-1 flex items-center gap-1.5 font-medium">
                                    <ActivityIcon className="w-3.5 h-3.5 text-accent-cyan" /> Combined Fitness
                                </div>
                                <div className="text-2xl font-mono font-bold text-foreground">
                                    {combinedSportStats.ctlCombined.toFixed(0)} <span className="text-xs text-foreground-muted font-normal">CTL</span>
                                </div>
                                <div className="text-xs text-foreground-muted mt-1 flex items-center gap-2">
                                    <span>ATL: {combinedSportStats.atlCombined.toFixed(0)}</span>
                                    <span>TSB: <span className={combinedSportStats.tsbCombined >= 0 ? 'text-positive' : 'text-accent-pink'}>
                                        {combinedSportStats.tsbCombined >= 0 ? `+${combinedSportStats.tsbCombined.toFixed(0)}` : combinedSportStats.tsbCombined.toFixed(0)}
                                    </span></span>
                                </div>
                            </div>

                            <div className="glass-card p-4">
                                <div className="text-xs text-foreground-muted mb-1 flex items-center gap-1.5 font-medium">
                                    <ActivityIcon className="w-3.5 h-3.5 text-accent-blue" /> Running Volume
                                </div>
                                <div className="text-2xl font-mono font-bold text-foreground">
                                    {combinedSportStats.runDistKm} <span className="text-xs text-foreground-muted font-normal">km</span>
                                </div>
                                <div className="text-xs text-foreground-muted mt-1">
                                    {combinedSportStats.runCount} runs recorded
                                </div>
                            </div>

                            <div className="glass-card p-4">
                                <div className="text-xs text-foreground-muted mb-1 flex items-center gap-1.5 font-medium">
                                    <Zap className="w-3.5 h-3.5 text-accent-orange" /> Cycling Distance
                                </div>
                                <div className="text-2xl font-mono font-bold text-foreground">
                                    {combinedSportStats.bikeDistKm} <span className="text-xs text-foreground-muted font-normal">km</span>
                                </div>
                                <div className="text-xs text-foreground-muted mt-1">
                                    {combinedSportStats.bikeCount} rides recorded
                                </div>
                            </div>

                            <div className="glass-card p-4">
                                <div className="text-xs text-foreground-muted mb-1 flex items-center gap-1.5 font-medium">
                                    <TrendingUp className="w-3.5 h-3.5 text-accent-purple" /> Total Training Time
                                </div>
                                <div className="text-2xl font-mono font-bold text-foreground">
                                    {combinedSportStats.totalHours} <span className="text-xs text-foreground-muted font-normal">hours</span>
                                </div>
                                <div className="text-xs text-foreground-muted mt-1">
                                    {combinedSportStats.totalActivities} total activities
                                </div>
                            </div>
                        </div>

                        {/* Multi-Sport PMC */}
                        <SplitPmcChart
                            data={cyclingData?.pmcSeries?.length ? cyclingData.pmcSeries : fitnessData}
                            initialView="combined"
                            title="Multi-Sport Performance Management (PMC)"
                            hideRangeSelector
                            currentRange={pmcRange}
                        />

                        {/* Combined Volume & Training Time Chart */}
                        <LazyChartWrapper height="24rem">
                            <CombinedAnalyticsChart
                                data={combinedData}
                                timeRange={timeRange}
                                onTimeRangeChange={setTimeRange}
                            />
                        </LazyChartWrapper>

                        {/* Highlights */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Running Highlights */}
                            <div className="glass-card p-6 flex flex-col justify-between">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <ActivityIcon className="w-5 h-5 text-accent-blue" />
                                            <h3 className="font-semibold text-foreground text-base">Running Highlights</h3>
                                        </div>
                                        <span className="text-xs font-mono bg-accent-blue/15 text-accent-blue px-2 py-0.5 rounded-full font-medium">
                                            VDOT {runalyzeMetrics.vdot > 0 ? runalyzeMetrics.vdot.toFixed(1) : '-'}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                                        <div className="p-3 bg-background-tertiary rounded-lg border border-line">
                                            <span className="text-foreground-muted block mb-1">Effective VO2max</span>
                                            <span className="text-lg font-mono font-bold text-foreground">
                                                {runalyzeMetrics.effectiveVO2max > 0 ? runalyzeMetrics.effectiveVO2max.toFixed(1) : '-'}
                                            </span>
                                        </div>
                                        <div className="p-3 bg-background-tertiary rounded-lg border border-line">
                                            <span className="text-foreground-muted block mb-1">Marathon Shape</span>
                                            <span className="text-lg font-mono font-bold text-foreground">
                                                {runalyzeMetrics.shape}%
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setSelectedSport('RUNNING')}
                                    className="mt-6 w-full py-2.5 px-4 rounded-lg bg-background-tertiary border border-line hover:bg-surface-hover text-foreground font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
                                >
                                    Open Full Running Analytics
                                    <ChevronRight className="w-4 h-4 text-accent-blue" />
                                </button>
                            </div>

                            {/* Cycling Highlights */}
                            <div className="glass-card p-6 flex flex-col justify-between">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Zap className="w-5 h-5 text-accent-orange" />
                                            <h3 className="font-semibold text-foreground text-base">Cycling Highlights</h3>
                                        </div>
                                        <span className="text-xs font-mono bg-accent-orange/15 text-accent-orange px-2 py-0.5 rounded-full font-medium">
                                            FTP {cyclingData?.ftp?.ftpWatts ?? cyclingData?.ftp?.eFtpWatts ?? '-'} W
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                                        <div className="p-3 bg-background-tertiary rounded-lg border border-line">
                                            <span className="text-foreground-muted block mb-1">Period Bike TSS</span>
                                            <span className="text-lg font-mono font-bold text-foreground">
                                                {cyclingData?.summary?.totalBikeTss ? cyclingData.summary.totalBikeTss.toLocaleString() : '0'}
                                            </span>
                                        </div>
                                        <div className="p-3 bg-background-tertiary rounded-lg border border-line">
                                            <span className="text-foreground-muted block mb-1">Aerobic EF</span>
                                            <span className="text-lg font-mono font-bold text-foreground">
                                                {cyclingData?.summary?.avgEfficiencyFactor ? `${cyclingData.summary.avgEfficiencyFactor.toFixed(2)}` : '-'}
                                            </span>
                                        </div>
                                    </div>
                                    <p className="text-xs text-foreground-muted">
                                        Mechanical energy output: <span className="font-mono text-foreground font-medium">{cyclingData?.summary?.totalKilojoules ? `${Math.round(cyclingData.summary.totalKilojoules).toLocaleString()} kJ` : '-'}</span>
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setSelectedSport('CYCLING')}
                                    className="mt-6 w-full py-2.5 px-4 rounded-lg bg-background-tertiary border border-line hover:bg-surface-hover text-foreground font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
                                >
                                    Open Full Cycling Analytics
                                    <ChevronRight className="w-4 h-4 text-accent-orange" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* === RUNNING SPORT VIEW === */}
                {selectedSport === 'RUNNING' && (
                    <div className="space-y-8 animate-fade-in">
                        {/* TOP METRICS */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Aerobic Fitness (VO2max) — HR-based trend indicator */}
                            <div className="glass-card p-6 text-center">
                                <p className="text-foreground-muted text-sm mb-2">Aerobic Fitness (VO2max)</p>
                                <p className="text-4xl font-bold text-foreground font-mono tabular-nums">
                                    {runalyzeMetrics.effectiveVO2max > 0 ? runalyzeMetrics.effectiveVO2max.toFixed(1) : '-'}
                                </p>
                                <p className="text-xs text-foreground-muted mt-1">Pace + Heart Rate based</p>
                            </div>

                            {/* Marathon Shape */}
                            <div className="glass-card p-6 text-center">
                                <p className="text-foreground-muted text-sm mb-2">Marathon Shape</p>
                                <p className={`text-4xl font-bold font-mono tabular-nums ${runalyzeMetrics.shape >= 100 ? 'text-positive' :
                                    runalyzeMetrics.shape >= 70 ? 'text-workout-tempo' : 'text-negative'
                                    }`}>
                                    {runalyzeMetrics.shape}%
                                </p>
                                <div className="flex justify-center gap-4 mt-2 text-xs text-foreground-muted font-mono tabular-nums">
                                    <span>Mileage: {runalyzeMetrics.mileageScore}%</span>
                                    <span>Long Runs: {runalyzeMetrics.longRunScore}%</span>
                                </div>
                            </div>

                            {/* Predictions */}
                            <div className="glass-card p-6 text-center relative">
                                <button
                                    onClick={onOpenCalibration}
                                    className="absolute top-2 right-2 p-2 text-foreground-muted hover:text-foreground transition"
                                    title="Calibrate"
                                >
                                    <Settings className="w-5 h-5 text-foreground-muted" />
                                </button>
                                <p className="text-foreground-muted text-sm mb-2">Marathon Prediction</p>
                                <div className="flex justify-center items-baseline gap-3">
                                    <div>
                                        <p className="text-xs text-foreground-muted">Optimal</p>
                                        <p className="text-lg font-semibold text-positive font-mono tabular-nums">
                                            {runalyzeMetrics.optimalTime > 0 ? formatTime(runalyzeMetrics.optimalTime) : '-'}
                                        </p>
                                    </div>
                                    <span className="text-foreground-secondary">→</span>
                                    <div>
                                        <p className="text-xs text-foreground-muted">Predicted</p>
                                        <p className="text-2xl font-bold text-foreground font-mono tabular-nums">
                                            {runalyzeMetrics.predictedTime > 0 ? formatTime(runalyzeMetrics.predictedTime) : '-'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Running PMC */}
                        <SplitPmcChart
                            data={cyclingData?.pmcSeries?.length ? cyclingData.pmcSeries : fitnessData}
                            initialView="running"
                            title="Running Fitness & Fatigue (rTSS PMC)"
                            hideRangeSelector
                            currentRange={pmcRange}
                        />

                        {/* Combined Analytics Chart */}
                        <LazyChartWrapper height="24rem">
                            <CombinedAnalyticsChart
                                data={combinedData}
                                timeRange={timeRange}
                                onTimeRangeChange={setTimeRange}
                            />
                        </LazyChartWrapper>

                        {/* Time in Zones */}
                        <ZoneDistributionSection
                            activities={activitiesData?.activities || []}
                            userData={userData}
                        />

                        {/* Race Prediction Chart */}
                        <LazyChartWrapper height="24rem">
                            <RacePredictionChart
                                effectiveVO2max={runalyzeMetrics.effectiveVO2max}
                                currentShape={runalyzeMetrics.shape}
                                calibrationFactor={runalyzeMetrics.calibrationFactor}
                            />
                        </LazyChartWrapper>

                        {/* Race Prediction Time Trends Chart */}
                        <LazyChartWrapper height="22rem">
                            <RacePredictionTimeChart
                                vo2TrendData={vo2TrendData}
                                shapeTrendData={shapeTrendData}
                                calibrationFactor={runalyzeMetrics.calibrationFactor}
                            />
                        </LazyChartWrapper>

                        {/* Training Paces (VDOT-driven) */}
                        <div className="glass-card p-6">
                            <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
                                <h3 className="text-lg font-semibold text-foreground">Training Paces</h3>
                                <p className="text-sm text-foreground-muted">
                                    VDOT (Training Paces):{' '}
                                    <span className="font-mono tabular-nums font-semibold text-foreground">
                                        {runalyzeMetrics.vdot > 0 ? runalyzeMetrics.vdot.toFixed(1) : '-'}
                                    </span>
                                </p>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                <div className="p-4 rounded-md bg-zone-1/10 border border-zone-1/20 text-center">
                                    <p className="text-zone-1 text-xs font-semibold mb-1">Easy</p>
                                    <p className="text-foreground font-semibold text-lg font-mono tabular-nums">
                                        {trainingPaces?.easy ? `${formatPace(trainingPaces.easy.min)} - ${formatPace(trainingPaces.easy.max)}` : '-'}
                                    </p>
                                </div>
                                <div className="p-4 rounded-md bg-accent-blue/10 border border-accent-blue/20 text-center">
                                    <p className="text-accent-blue text-xs font-semibold mb-1">Marathon</p>
                                    <p className="text-foreground font-semibold text-lg font-mono tabular-nums">
                                        {trainingPaces?.marathon ? formatPace(trainingPaces.marathon) : '-'}
                                    </p>
                                </div>
                                <div className="p-4 rounded-md bg-zone-3/10 border border-zone-3/20 text-center">
                                    <p className="text-zone-3 text-xs font-semibold mb-1">Threshold</p>
                                    <p className="text-foreground font-semibold text-lg font-mono tabular-nums">
                                        {trainingPaces?.threshold ? formatPace(trainingPaces.threshold) : '-'}
                                    </p>
                                </div>
                                <div className="p-4 rounded-md bg-zone-4/10 border border-zone-4/20 text-center">
                                    <p className="text-zone-4 text-xs font-semibold mb-1">Interval</p>
                                    <p className="text-foreground font-semibold text-lg font-mono tabular-nums">
                                        {trainingPaces?.interval ? formatPace(trainingPaces.interval) : '-'}
                                    </p>
                                </div>
                                <div className="p-4 rounded-md bg-zone-5/10 border border-zone-5/20 text-center">
                                    <p className="text-zone-5 text-xs font-semibold mb-1">Repetition</p>
                                    <p className="text-foreground font-semibold text-lg font-mono tabular-nums">
                                        {trainingPaces?.repetition ? formatPace(trainingPaces.repetition) : '-'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Trend Charts */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* VO2max Trend */}
                            <LazyChartWrapper height="20rem">
                                <div className="glass-card p-6">
                                    <h3 className="text-lg font-semibold text-foreground mb-4">Aerobic Fitness (VO2max) Trend</h3>
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={vo2TrendData}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                                                <XAxis dataKey="date" stroke="var(--foreground-muted)" fontSize={11} tickLine={false} />
                                                <YAxis stroke="var(--foreground-muted)" fontSize={11} tickLine={false} domain={['auto', 'auto']} />
                                                <Tooltip content={<AnalyticsTooltip />} />
                                                <Line type="monotone" dataKey="vo2Rolling" stroke="var(--positive)" strokeWidth={2} dot={false} name="Aerobic Fitness (VO2max)" />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </LazyChartWrapper>

                            {/* Shape Trend */}
                            <LazyChartWrapper height="20rem">
                                <div className="glass-card p-6">
                                    <h3 className="text-lg font-semibold text-foreground mb-4">Shape Trend</h3>
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={shapeTrendData}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                                                <XAxis dataKey="week" stroke="var(--foreground-muted)" fontSize={11} tickLine={false} />
                                                <YAxis stroke="var(--foreground-muted)" fontSize={11} tickLine={false} domain={[0, 120]} />
                                                <Tooltip content={<AnalyticsTooltip />} />
                                                <Area type="monotone" dataKey="shape" stroke="var(--accent-blue)" fill="var(--accent-blue)" fillOpacity={0.08} name="Shape %" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </LazyChartWrapper>
                        </div>

                        {/* Fitness & Form */}
                        <LazyChartWrapper height="22rem">
                            <div className="glass-card p-6">
                                <h3 className="text-lg font-semibold text-foreground mb-4">Fitness & Form</h3>
                                <div className="h-72">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={fitnessData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                                            <XAxis dataKey="date" stroke="var(--foreground-muted)" fontSize={11} tickLine={false} />
                                            <YAxis stroke="var(--foreground-muted)" fontSize={11} tickLine={false} />
                                            <Tooltip content={<AnalyticsTooltip />} />
                                            <Legend />
                                            <Line type="monotone" dataKey="ctl" stroke="var(--accent-blue)" strokeWidth={2} dot={false} name="Fitness (CTL)" />
                                            <Line type="monotone" dataKey="atl" stroke="var(--workout-tempo)" strokeWidth={2} dot={false} name="Fatigue (ATL)" />
                                            <Line type="monotone" dataKey="tsb" stroke="var(--accent-orange)" strokeWidth={2} dot={false} name="Form (TSB)" />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </LazyChartWrapper>
                    </div>
                )}

                {/* === CYCLING SPORT VIEW === */}
                {selectedSport === 'CYCLING' && (
                    <CyclingAnalyticsSection initialRange={pmcRange} />
                )}
            </main>

            {showHeader && <Footer />}
        </div>
    );
}

export default memo(AnalyticsView);
