'use client';

import { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart, ComposedChart, Bar } from 'recharts';

interface DataPoint {
    date: string;
    vo2max?: number;
    vo2maxRolling?: number;
    ctl?: number;
    atl?: number;
    tsb?: number;
    volume?: number;
    volumeRolling?: number;
    trainingTime?: number; // minutes
    trainingTimeRolling?: number; // minutes
}

export type TimeRange = 'ALL' | '1Y' | '6M' | '3M' | '1M';

interface CombinedAnalyticsChartProps {
    data: DataPoint[];
    timeRange: TimeRange;
    onTimeRangeChange: (range: TimeRange) => void;
}

const SERIES_CONFIG = {
    vo2max: { name: 'VO2max', color: '#f59e0b', yAxisId: 'left' },
    ctl: { name: 'Fitness (CTL)', color: '#10b981', yAxisId: 'right' },
    atl: { name: 'Fatigue (ATL)', color: '#ef4444', yAxisId: 'right' },
    tsb: { name: 'Form (TSB)', color: '#3b82f6', yAxisId: 'right' },
    volume: { name: 'Weekly Volume (km)', color: '#8b5cf6', yAxisId: 'volume' },
    trainingTime: { name: 'Training Time (h)', color: '#ec4899', yAxisId: 'volume' },
};

type SeriesKey = keyof typeof SERIES_CONFIG;

export default function CombinedAnalyticsChart({ data, timeRange, onTimeRangeChange }: CombinedAnalyticsChartProps) {
    const [visibleSeries, setVisibleSeries] = useState<Record<SeriesKey, boolean>>({
        vo2max: true,
        ctl: true,
        atl: true,
        tsb: true,
        volume: false,
        trainingTime: false,
    });

    const toggleSeries = (key: SeriesKey) => {
        setVisibleSeries(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    // Filter data based on Time Range
    const filteredData = useMemo(() => {
        if (timeRange === 'ALL') return data;

        const now = new Date();
        const cutoff = new Date();

        switch (timeRange) {
            case '1Y': cutoff.setFullYear(now.getFullYear() - 1); break;
            case '6M': cutoff.setMonth(now.getMonth() - 6); break;
            case '3M': cutoff.setMonth(now.getMonth() - 3); break;
            case '1M': cutoff.setMonth(now.getMonth() - 1); break;
        }

        return data.filter(d => new Date(d.date) >= cutoff);
    }, [data, timeRange]);

    // Convert training time to hours for display
    const chartData = useMemo(() => {
        return filteredData.map(d => ({
            ...d,
            trainingTimeHours: d.trainingTime ? Math.round(d.trainingTime / 60 * 10) / 10 : undefined,
            trainingTimeRollingHours: d.trainingTimeRolling ? Math.round(d.trainingTimeRolling / 60 * 10) / 10 : undefined,
        }));
    }, [filteredData]);

    // Calculate domains for each axis
    const domains = useMemo(() => {
        const vo2Values = filteredData.flatMap(d => [d.vo2max, d.vo2maxRolling].filter(Boolean) as number[]);
        const fitnessValues = filteredData.flatMap(d => [d.ctl, d.atl, d.tsb].filter(Boolean) as number[]);
        const volumeValues = filteredData.flatMap(d => [d.volume, d.volumeRolling].filter(Boolean) as number[]);
        const timeValues = chartData.flatMap(d => [d.trainingTimeHours, d.trainingTimeRollingHours].filter(Boolean) as number[]);

        return {
            vo2: vo2Values.length ? [Math.floor(Math.min(...vo2Values) - 1), Math.ceil(Math.max(...vo2Values) + 1)] : [0, 60],
            fitness: fitnessValues.length ? [Math.min(...fitnessValues) - 5, Math.max(...fitnessValues) + 5] : [-30, 30],
            volume: [...volumeValues, ...timeValues].length
                ? [0, Math.max(...volumeValues, ...timeValues) * 1.1]
                : [0, 100],
        };
    }, [filteredData, chartData]);

    if (!data.length) {
        return (
            <div className="glass-card p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Combined Analytics</h3>
                <p className="text-foreground-muted">No data available</p>
            </div>
        );
    }

    return (
        <div className="glass-card p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h3 className="text-lg font-semibold text-foreground">Combined Analytics Overview</h3>

                {/* Time Range Filter */}
                <div className="flex bg-background-secondary rounded-lg p-1 border border-glass-border">
                    {(['1M', '3M', '6M', '1Y', 'ALL'] as TimeRange[]).map(range => (
                        <button
                            key={range}
                            onClick={() => onTimeRangeChange(range)}
                            className={`px-3 py-1 text-xs font-medium rounded transition-all ${timeRange === range
                                ? 'bg-zinc-700 text-white shadow-sm' // Active state can stay distinct or use generic active var
                                : 'text-foreground-muted hover:text-foreground'
                                }`}
                            style={timeRange === range ? { backgroundColor: 'var(--accent-purple)' } : {}}
                        >
                            {range}
                        </button>
                    ))}
                </div>
            </div>

            {/* Toggle Controls */}
            <div className="flex flex-wrap gap-2 mb-6">
                {(Object.keys(SERIES_CONFIG) as SeriesKey[]).map(key => (
                    <button
                        key={key}
                        onClick={() => toggleSeries(key)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all flex items-center gap-2 border ${visibleSeries[key]
                            ? 'text-white border-transparent'
                            : 'bg-transparent text-foreground-muted border-glass-border hover:border-foreground-muted'
                            }`}
                        style={{
                            backgroundColor: visibleSeries[key] ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                            borderColor: visibleSeries[key] ? 'rgba(255, 255, 255, 0.2)' : undefined
                        }}
                    >
                        <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: visibleSeries[key] ? SERIES_CONFIG[key].color : 'var(--foreground-muted)' }}
                        />
                        <span style={{ color: visibleSeries[key] ? 'var(--foreground)' : 'var(--foreground-muted)' }}>
                            {SERIES_CONFIG[key].name}
                        </span>
                    </button>
                ))}
            </div>

            {/* Chart */}
            <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData}>
                        <defs>
                            <linearGradient id="colorTrainingTime" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={SERIES_CONFIG.trainingTime.color} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={SERIES_CONFIG.trainingTime.color} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" />
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

                        {/* Left Y-Axis: VO2max */}
                        <YAxis
                            yAxisId="left"
                            orientation="left"
                            stroke="#f59e0b"
                            fontSize={11}
                            domain={domains.vo2 as [number, number]}
                            tickLine={false}
                            axisLine={false}
                            hide={!visibleSeries.vo2max}
                        />

                        {/* Right Y-Axis: Fitness metrics */}
                        <YAxis
                            yAxisId="right"
                            orientation="right"
                            stroke="#10b981"
                            fontSize={11}
                            domain={domains.fitness as [number, number]}
                            tickLine={false}
                            axisLine={false}
                            hide={!visibleSeries.ctl && !visibleSeries.atl && !visibleSeries.tsb}
                        />

                        {/* Volume Y-Axis (hidden, used for scaling Volume and Time) */}
                        <YAxis
                            yAxisId="volume"
                            orientation="right"
                            stroke="#8b5cf6"
                            fontSize={11}
                            domain={domains.volume as [number, number]}
                            tickLine={false}
                            axisLine={false}
                            hide={true}
                        />

                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'var(--glass-bg)',
                                border: '1px solid var(--glass-border)',
                                borderRadius: '8px',
                                boxShadow: 'var(--card-shadow)',
                                backdropFilter: 'blur(12px)'
                            }}
                            itemStyle={{ color: 'var(--foreground)' }}
                            labelStyle={{ color: 'var(--foreground-muted)' }}
                            labelFormatter={(val) => new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        />

                        {/* VO2max Rolling Average (Smooth Line) */}
                        {visibleSeries.vo2max && (
                            <Line
                                yAxisId="left"
                                type="monotone"
                                dataKey="vo2maxRolling"
                                stroke={SERIES_CONFIG.vo2max.color}
                                strokeWidth={2}
                                dot={false}
                                name="VO2max (Avg)"
                            />
                        )}

                        {/* Fitness Lines */}
                        {visibleSeries.ctl && (
                            <Line
                                yAxisId="right"
                                type="monotone"
                                dataKey="ctl"
                                stroke={SERIES_CONFIG.ctl.color}
                                strokeWidth={2}
                                dot={false}
                                name="Fitness (CTL)"
                            />
                        )}
                        {visibleSeries.atl && (
                            <Line
                                yAxisId="right"
                                type="monotone"
                                dataKey="atl"
                                stroke={SERIES_CONFIG.atl.color}
                                strokeWidth={2}
                                dot={false}
                                name="Fatigue (ATL)"
                            />
                        )}
                        {visibleSeries.tsb && (
                            <Line
                                yAxisId="right"
                                type="monotone"
                                dataKey="tsb"
                                stroke={SERIES_CONFIG.tsb.color}
                                strokeWidth={2}
                                dot={false}
                                name="Form (TSB)"
                            />
                        )}

                        {/* Volume Bar (Only visible in 1M view OR if explicitly enabled in other views - but user request implies specific handling) */}
                        {visibleSeries.volume && timeRange === '1M' && (
                            <Bar
                                yAxisId="volume"
                                dataKey="volume"
                                fill={SERIES_CONFIG.volume.color}
                                opacity={0.3}
                                name="Daily Volume (km)"
                                radius={[4, 4, 0, 0]}
                            />
                        )}

                        {/* Volume Rolling Line (Weekly Volume) */}
                        {visibleSeries.volume && (
                            <Line
                                yAxisId="volume"
                                type="monotone"
                                dataKey="volumeRolling"
                                stroke={SERIES_CONFIG.volume.color}
                                strokeWidth={2}
                                dot={false}
                                name="Weekly Volume (km)"
                            />
                        )}

                        {/* Training Time (Area - Daily - Only in 1M view) */}
                        {visibleSeries.trainingTime && timeRange === '1M' && (
                            <Area
                                yAxisId="volume"
                                type="monotone"
                                dataKey="trainingTimeHours"
                                stroke="none"
                                fill="url(#colorTrainingTime)"
                                fillOpacity={0.6}
                                name="Daily Time (h)"
                            />
                        )}

                        {/* Training Time Rolling Line */}
                        {visibleSeries.trainingTime && (
                            <Line
                                yAxisId="volume"
                                type="monotone"
                                dataKey="trainingTimeRollingHours"
                                stroke={SERIES_CONFIG.trainingTime.color}
                                strokeWidth={2}
                                dot={false}
                                name="Weekly Time (h)"
                            />
                        )}
                    </ComposedChart>
                </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap justify-center gap-4 text-xs text-foreground-muted">
                <span>🟡 VO2max = Aerobic power</span>
                <span>🟢 CTL = Long-term fitness</span>
                <span>🔴 ATL = Short-term fatigue</span>
                <span>🔵 TSB = Form (CTL - ATL)</span>
            </div>
        </div>
    );
}
