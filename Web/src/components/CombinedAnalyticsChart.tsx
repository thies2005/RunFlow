'use client';

import { useState, useMemo, useCallback, memo } from 'react';
import { Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, ComposedChart, Bar } from 'recharts';
import { ChartTooltip } from '@/components/charts/ChartTooltip';

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
    onTimeRangeChange: (_range: TimeRange) => void;
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

// Memoized series toggle buttons component
const SeriesToggleButtons = memo(({
    visibleSeries,
    onToggle
}: {
    visibleSeries: Record<SeriesKey, boolean>;
    onToggle: (_key: SeriesKey) => void;
}) => {
    return (
        <>
            {(Object.keys(SERIES_CONFIG) as SeriesKey[]).map(key => (
                <button
                    key={key}
                    onClick={() => onToggle(key)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all flex items-center gap-2 border ${visibleSeries[key]
                        ? 'bg-surface-hover text-foreground border-accent-purple/50'
                        : 'bg-transparent text-foreground-muted border-glass-border hover:border-foreground-muted'
                        }`}
                    style={{
                        backgroundColor: visibleSeries[key] ? 'var(--surface-hover)' : 'transparent',
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
        </>
    );
});

SeriesToggleButtons.displayName = 'SeriesToggleButtons';

// Memoized time range buttons component
const TimeRangeButtons = memo(({
    timeRange,
    onTimeRangeChange
}: {
    timeRange: TimeRange;
    onTimeRangeChange: (_range: TimeRange) => void;
}) => {
    const ranges: TimeRange[] = ['1M', '3M', '6M', '1Y', 'ALL'];

    return (
        <div className="flex bg-background-secondary rounded-lg p-1 border border-glass-border">
            {ranges.map(range => (
                <button
                    key={range}
                    onClick={() => onTimeRangeChange(range)}
                    className={`px-3 py-1 text-xs font-medium rounded transition-all ${timeRange === range
                        ? 'bg-foreground/15 text-foreground shadow-xs'
                        : 'text-foreground-muted hover:text-foreground'
                        }`}
                    style={timeRange === range ? { backgroundColor: 'var(--accent-purple)' } : {}}
                >
                    {range}
                </button>
            ))}
        </div>
    );
});

TimeRangeButtons.displayName = 'TimeRangeButtons';

// Memoized date formatter for tick labels
const useDateFormatter = (timeRange: TimeRange) => {
    return useMemo(() => {
        return (val: string) => {
            const date = new Date(val);
            if (timeRange === '1M') {
                return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
            } else if (['3M', '6M'].includes(timeRange)) {
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            } else {
                return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
            }
        };
    }, [timeRange]);
};


function CombinedAnalyticsChart({ data, timeRange, onTimeRangeChange }: CombinedAnalyticsChartProps) {
    const [visibleSeries, setVisibleSeries] = useState<Record<SeriesKey, boolean>>({
        vo2max: true,
        ctl: true,
        atl: true,
        tsb: true,
        volume: false,
        trainingTime: false,
    });

    const toggleSeries = useCallback((key: SeriesKey) => {
        setVisibleSeries(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    }, []);

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

    // Calculate domains for each axis - optimized with single pass
    const domains = useMemo(() => {
        const vo2Values: number[] = [];
        const fitnessValues: number[] = [];
        const volumeValues: number[] = [];
        const timeValues: number[] = [];

        for (const d of filteredData) {
            if (d.vo2max) vo2Values.push(d.vo2max);
            if (d.vo2maxRolling) vo2Values.push(d.vo2maxRolling);
            if (d.ctl) fitnessValues.push(d.ctl);
            if (d.atl) fitnessValues.push(d.atl);
            if (d.tsb) fitnessValues.push(d.tsb);
            if (d.volume) volumeValues.push(d.volume);
            if (d.volumeRolling) volumeValues.push(d.volumeRolling);
        }
        for (const d of chartData) {
            if (d.trainingTimeHours) timeValues.push(d.trainingTimeHours);
            if (d.trainingTimeRollingHours) timeValues.push(d.trainingTimeRollingHours);
        }

        return {
            vo2: vo2Values.length ? [Math.floor(Math.min(...vo2Values) - 1), Math.ceil(Math.max(...vo2Values) + 1)] : [0, 60],
            fitness: fitnessValues.length ? [Math.min(...fitnessValues) - 5, Math.max(...fitnessValues) + 5] : [-30, 30],
            volume: [...volumeValues, ...timeValues].length
                ? [0, Math.max(...volumeValues, ...timeValues) * 1.1]
                : [0, 100],
        };
    }, [filteredData, chartData]);

    const tickFormatter = useDateFormatter(timeRange);

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
                <TimeRangeButtons timeRange={timeRange} onTimeRangeChange={onTimeRangeChange} />
            </div>

            {/* Toggle Controls */}
            <div className="flex flex-wrap gap-2 mb-6">
                <SeriesToggleButtons visibleSeries={visibleSeries} onToggle={toggleSeries} />
            </div>

            {/* Chart */}
            <div className="h-80 w-full overflow-x-auto">
                {/* On mobile: fixed min-width to force scrolling. On desktop (md): min-width 0 to allow resizing */}
                <div className="min-w-[600px] md:min-w-0 w-full h-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData}>
                            <defs>
                                <linearGradient id="colorTrainingTime" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={SERIES_CONFIG.trainingTime.color} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={SERIES_CONFIG.trainingTime.color} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#4B5563" opacity={0.4} vertical={false} />
                            <XAxis
                                dataKey="date"
                                stroke="var(--foreground-muted)"
                                fontSize={11}
                                tickLine={false}
                                minTickGap={timeRange === '1M' ? 20 : 50}
                                tickFormatter={tickFormatter}
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
                                tickFormatter={(val) => val.toFixed(0)}
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

                            <Tooltip content={<ChartTooltip labelFormatter={(label: any) => new Date(label).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} formatter={(value: any) => typeof value === 'number' ? value.toFixed(1) : value} />} />

                            {/* VO2max Rolling Average (Smooth Line) */}
                            {visibleSeries.vo2max && (
                                <Line
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="vo2maxRolling"
                                    stroke={SERIES_CONFIG.vo2max.color}
                                    strokeWidth={2}
                                    dot={false}
                                    isAnimationActive={false}
                                    connectNulls
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
                                    connectNulls
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
                                    connectNulls
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
                                    connectNulls
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
                                    connectNulls
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
                                    connectNulls
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
                                    connectNulls
                                    name="Weekly Time (h)"
                                />
                            )}
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap justify-center gap-4 text-xs text-foreground-muted">
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div><span>VO2max = Aerobic power</span></div>
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-green-500"></div><span>CTL = Long-term fitness</span></div>
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-red-500"></div><span>ATL = Short-term fatigue</span></div>
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div><span>TSB = Form (CTL - ATL)</span></div>
            </div>
        </div >
    );
}

// Memoize the entire component to prevent unnecessary re-renders
export default memo(CombinedAnalyticsChart, (prevProps, nextProps) => {
    return (
        prevProps.data === nextProps.data &&
        prevProps.timeRange === nextProps.timeRange
    );
});
