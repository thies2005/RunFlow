'use client';

import { useState, memo, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area, LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { predictRaceTime, formatTime, formatPace } from '@/lib/metrics/vdot';
import { calculateAllRacePredictions } from '@/lib/metrics/runalyze';
import LazyChartWrapper from '@/components/LazyChartWrapper';
import { ChartTooltip } from '@/components/charts/ChartTooltip';


type AnalyticsDashboardProps = {
    currentVdot: number | null;
    effectiveVO2max?: number;
    shapePercent?: number;
};

const RANGES = [
    { label: 'Last 4 Weeks', value: '4_WEEKS' },
    { label: 'Last 12 Weeks', value: '12_WEEKS' },
    { label: 'Last 6 Months', value: '6_MONTHS' },
    { label: 'Last Year', value: '1_YEAR' },
    { label: 'All Time', value: 'ALL' },
];

interface HistoryResponse {
    weeklyVolume: { date: string; km: number }[];
    zoneTrend: { date: string; Z1: number; Z2: number; Z3: number; Z4: number; Z5: number; Z6: number; Z7: number }[];
    fitnessTrend: { date: string; ctl: number; atl: number; tsb: number }[];
    vdotTrend: { date: string; vdot: number }[];
    totals: { distance: number; activities: number; averagePace: number };
}

// ============================================
// Memoized Chart Sub-Components
// ============================================

const formatZoneTime = (minutes: number) => {
    if (minutes >= 60) {
        const hours = Math.floor(minutes / 60);
        const mins = Math.round(minutes % 60);
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${Math.round(minutes)}m`;
};

// Zone Trend Chart
const ZoneTrendChart = memo(({ data }: { data: HistoryResponse['zoneTrend'] }) => (
    <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Training Zone Trend</h3>
        <div className="h-64" role="img" aria-label="Training Zone Trend Chart">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#4B5563" vertical={false} />
                    <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 60 ? `${Math.round(v / 60)}h` : `${v}m`} />
                    <Tooltip content={<ChartTooltip formatter={(value: string | number) => {
                        const numVal = typeof value === 'number' ? value : parseFloat(String(value));
                        if (numVal >= 60) {
                            const hours = Math.floor(numVal / 60);
                            const mins = Math.round(numVal % 60);
                            return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
                        }
                        return `${Math.round(numVal)}m`;
                    }} />} />
                    <Area type="monotone" dataKey="Z1" stackId="1" stroke="#10b981" fill="#10b981" name="Z1 Recovery" />
                    <Area type="monotone" dataKey="Z2" stackId="1" stroke="#84cc16" fill="#84cc16" name="Z2 Aerobic" />
                    <Area type="monotone" dataKey="Z3" stackId="1" stroke="#eab308" fill="#eab308" name="Z3 Tempo" />
                    <Area type="monotone" dataKey="Z4" stackId="1" stroke="#f97316" fill="#f97316" name="Z4 Threshold" />
                    <Area type="monotone" dataKey="Z5" stackId="1" stroke="#ef4444" fill="#ef4444" name="Z5 VO2max" />
                    <Area type="monotone" dataKey="Z6" stackId="1" stroke="#6366f1" fill="#6366f1" name="Z6 Anaerobic" />
                    <Area type="monotone" dataKey="Z7" stackId="1" stroke="#9333ea" fill="#9333ea" name="Z7 Neuromuscular" />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    </div>
));
ZoneTrendChart.displayName = 'ZoneTrendChart';

// Weekly Volume Chart
const WeeklyVolumeChart = memo(({ data }: { data: HistoryResponse['weeklyVolume'] }) => (
    <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Weekly Volume</h3>
        <div className="h-64" role="img" aria-label="Weekly Volume Chart">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#4B5563" vertical={false} />
                    <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} unit="km" />
                    <Tooltip cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} content={<ChartTooltip />} />
                    <Bar dataKey="km" fill="#60a5fa" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    </div>
));
WeeklyVolumeChart.displayName = 'WeeklyVolumeChart';

// Zone Pie Chart
const ZonePieChart = memo(({ zoneTrend }: { zoneTrend: HistoryResponse['zoneTrend'] }) => {
    const { pieData, total } = useMemo(() => {
        const zoneTotals = zoneTrend.reduce((acc, week) => ({
            Z1: acc.Z1 + (week.Z1 || 0),
            Z2: acc.Z2 + (week.Z2 || 0),
            Z3: acc.Z3 + (week.Z3 || 0),
            Z4: acc.Z4 + (week.Z4 || 0),
            Z5: acc.Z5 + (week.Z5 || 0),
            Z6: acc.Z6 + (week.Z6 || 0),
            Z7: acc.Z7 + (week.Z7 || 0),
        }), { Z1: 0, Z2: 0, Z3: 0, Z4: 0, Z5: 0, Z6: 0, Z7: 0 });

        const total = zoneTotals.Z1 + zoneTotals.Z2 + zoneTotals.Z3 + zoneTotals.Z4 + zoneTotals.Z5 + zoneTotals.Z6 + zoneTotals.Z7;

        const pieData = [
            { name: 'Z1 Recovery', value: zoneTotals.Z1, color: '#10b981' },
            { name: 'Z2 Aerobic', value: zoneTotals.Z2, color: '#84cc16' },
            { name: 'Z3 Tempo', value: zoneTotals.Z3, color: '#eab308' },
            { name: 'Z4 Threshold', value: zoneTotals.Z4, color: '#f97316' },
            { name: 'Z5 VO2max', value: zoneTotals.Z5, color: '#ef4444' },
            { name: 'Z6 Anaerobic', value: zoneTotals.Z6, color: '#6366f1' },
            { name: 'Z7 Neuromuscular', value: zoneTotals.Z7, color: '#9333ea' },
        ].filter(d => d.value > 0);

        return { pieData, total };
    }, [zoneTrend]);

    if (total === 0) return null;

    return (
        <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Time in Zones Distribution</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Pie Chart */}
                <div className="h-64" role="img" aria-label="Time in Zones Distribution Pie Chart">
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
                                content={<ChartTooltip formatter={(value: string | number) => formatZoneTime(typeof value === 'number' ? value : parseFloat(String(value)))} />}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Legend & Breakdown */}
                <div className="flex flex-col justify-center space-y-2">
                    {pieData.map((zone, i) => {
                        const pct = (zone.value / total) * 100;
                        return (
                            <div key={i} className="flex items-center justify-between p-2 hover:bg-foreground/5 rounded">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-xs" style={{ backgroundColor: zone.color }} />
                                    <span className="text-foreground-muted text-sm">{zone.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-foreground font-mono text-sm">{formatZoneTime(zone.value)}</span>
                                    <span className="text-foreground-muted text-xs w-12 text-right">{Math.round(pct)}%</span>
                                </div>
                            </div>
                        );
                    })}
                    <div className="border-t border-foreground/20 pt-2 mt-2 flex justify-between">
                        <span className="text-foreground-muted text-sm">Total</span>
                        <span className="text-foreground font-mono text-sm">{formatZoneTime(total)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
});
ZonePieChart.displayName = 'ZonePieChart';

// VDOT Trend Chart
const VDOTTrendChart = memo(({ data }: { data: HistoryResponse['vdotTrend'] }) => (
    <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">VDOT Trend</h3>
        <div className="h-64" role="img" aria-label="VDOT Trend Line Chart">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#4B5563" vertical={false} />
                    <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} domain={['dataMin - 1', 'dataMax + 1']} />
                    <Tooltip content={<ChartTooltip formatter={(value: string | number) => (typeof value === 'number' ? value : parseFloat(String(value))).toFixed(1)} />} />
                    <Line type="monotone" dataKey="vdot" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b' }} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    </div>
));
VDOTTrendChart.displayName = 'VDOTTrendChart';

// Fitness Trend Chart
const FitnessTrendChart = memo(({ data }: { data: HistoryResponse['fitnessTrend'] }) => (
    <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Fitness Tracking (Impulse-Response)</h3>
        <div className="h-64" role="img" aria-label="Fitness Tracking Chart showing CTL, ATL, and TSB">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#4B5563" vertical={false} />
                    <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => Math.round(val).toString()} />
                    <Tooltip content={<ChartTooltip formatter={(value: string | number) => (typeof value === 'number' ? value : parseFloat(String(value))).toFixed(1)} />} />
                    <Line type="monotone" dataKey="ctl" stroke="#3b82f6" strokeWidth={2} name="Fitness (CTL)" dot={false} />
                    <Line type="monotone" dataKey="atl" stroke="#ef4444" strokeWidth={2} name="Fatigue (ATL)" dot={false} />
                    <Line type="monotone" dataKey="tsb" stroke="#10b981" strokeWidth={2} name="Form (TSB)" dot={false} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    </div>
));
FitnessTrendChart.displayName = 'FitnessTrendChart';

// Stats Grid
const StatsGrid = memo(({ currentVdot, totals }: { currentVdot: number | null; totals: HistoryResponse['totals'] }) => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4 text-center">
            <p className="text-foreground-muted text-sm mb-1">Current VDOT</p>
            <p className="text-xl sm:text-3xl font-bold text-foreground">{currentVdot?.toFixed(1) || '-'}</p>
        </div>
        <div className="glass-card p-4 text-center">
            <p className="text-foreground-muted text-sm mb-1">Total Distance</p>
            <p className="text-xl sm:text-3xl font-bold text-foreground">
                {totals?.distance || 0}<span className="text-sm text-foreground-muted font-normal ml-1">km</span>
            </p>
        </div>
        <div className="glass-card p-4 text-center">
            <p className="text-foreground-muted text-sm mb-1">Total Activities</p>
            <p className="text-xl sm:text-3xl font-bold text-foreground">{totals?.activities || 0}</p>
        </div>
        <div className="glass-card p-4 text-center">
            <p className="text-foreground-muted text-sm mb-1">Avg Pace</p>
            <p className="text-xl sm:text-3xl font-bold text-foreground">
                {totals?.averagePace ? formatPace(totals.averagePace).replace('/km', '') : '-'}
            </p>
        </div>
    </div>
));
StatsGrid.displayName = 'StatsGrid';

const RacePredictions = memo(({ currentVdot, effectiveVO2max, shapePercent }: {
    currentVdot: number | null;
    effectiveVO2max?: number;
    shapePercent?: number;
}) => {
    const racePredictions = useMemo(() => {
        if (effectiveVO2max && effectiveVO2max > 0) {
            const shape = shapePercent ?? 0;
            const predictions = calculateAllRacePredictions(effectiveVO2max, shape);
            if (predictions.length === 0) return [];
            return predictions.map(p => ({
                race: p.distance,
                time: formatTime(p.predicted),
            }));
        }
        if (!currentVdot || currentVdot <= 0) return [];
        return [
            { race: '5K', time: formatTime(predictRaceTime(currentVdot, '5K')) },
            { race: '10K', time: formatTime(predictRaceTime(currentVdot, '10K')) },
            { race: 'Half', time: formatTime(predictRaceTime(currentVdot, 'HALF')) },
            { race: 'Marathon', time: formatTime(predictRaceTime(currentVdot, 'MARATHON')) },
        ];
    }, [currentVdot, effectiveVO2max, shapePercent]);

    if (racePredictions.length === 0) return null;

    const label = effectiveVO2max && effectiveVO2max > 0
        ? `VO2max ${effectiveVO2max.toFixed(1)} · Shape ${shapePercent ?? 0}%`
        : `VDOT ${currentVdot?.toFixed(1)}`;

    return (
        <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Race Predictions ({label})</h3>
            <div className="grid grid-cols-4 gap-4">
                {racePredictions.map(p => (
                    <div key={p.race} className="text-center">
                        <p className="text-foreground-muted text-sm">{p.race}</p>
                        <p className="text-2xl font-bold text-foreground">{p.time}</p>
                    </div>
                ))}
            </div>
        </div>
    );
});
RacePredictions.displayName = 'RacePredictions';

// ============================================
// Main Component
// ============================================

import { ChartErrorBoundary } from '@/components/ErrorBoundary';

function AnalyticsDashboardInner({ currentVdot, effectiveVO2max, shapePercent }: AnalyticsDashboardProps) {
    const [timeRange, setTimeRange] = useState('12_WEEKS');

    // Fetch Aggregated History
    const { data, isLoading } = useQuery<HistoryResponse>({
        queryKey: ['analytics-history', timeRange],
        queryFn: async () => {
            const res = await fetch(`/api/analytics/history?range=${timeRange}`);
            if (!res.ok) throw new Error('Failed to fetch analytics');
            return res.json();
        }
    });

    if (isLoading) {
        return <div className="animate-pulse h-96 bg-background-tertiary/50 rounded-xl"></div>;
    }

    if (!data) return null;

    const { weeklyVolume, zoneTrend, fitnessTrend, vdotTrend, totals } = data;

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <select
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value)}
                    className="bg-background-tertiary border border-foreground/20 rounded-lg p-2 text-sm text-foreground focus:ring-2 focus:ring-blue-500 outline-hidden"
                >
                    {RANGES.map(r => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ZoneTrendChart data={zoneTrend} />
                <WeeklyVolumeChart data={weeklyVolume} />
            </div>

            {zoneTrend.length > 0 && (
                <LazyChartWrapper height="20rem">
                    <ZonePieChart zoneTrend={zoneTrend} />
                </LazyChartWrapper>
            )}

            <StatsGrid currentVdot={currentVdot} totals={totals} />

            {vdotTrend.length > 0 && (
                <VDOTTrendChart data={vdotTrend} />
            )}

            <LazyChartWrapper height="16rem">
                <RacePredictions currentVdot={currentVdot} effectiveVO2max={effectiveVO2max} shapePercent={shapePercent} />
            </LazyChartWrapper>

            {fitnessTrend.length > 0 && (
                <LazyChartWrapper height="20rem">
                    <FitnessTrendChart data={fitnessTrend} />
                </LazyChartWrapper>
            )}
        </div>
    );
}

export default function AnalyticsDashboard(props: AnalyticsDashboardProps) {
    return (
        <ChartErrorBoundary chartName="Analytics Dashboard">
            <AnalyticsDashboardInner {...props} />
        </ChartErrorBoundary>
    );
}
