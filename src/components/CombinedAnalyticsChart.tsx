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
    trainingTime?: number; // minutes
}

interface CombinedAnalyticsChartProps {
    data: DataPoint[];
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
type TimeRange = 'ALL' | '1Y' | '6M' | '3M' | '1M';

export default function CombinedAnalyticsChart({ data }: CombinedAnalyticsChartProps) {
    const [timeRange, setTimeRange] = useState<TimeRange>('ALL');
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
        }));
    }, [filteredData]);

    // Calculate domains for each axis
    const domains = useMemo(() => {
        const vo2Values = filteredData.flatMap(d => [d.vo2max, d.vo2maxRolling].filter(Boolean) as number[]);
        const fitnessValues = filteredData.flatMap(d => [d.ctl, d.atl, d.tsb].filter(Boolean) as number[]);
        const volumeValues = filteredData.filter(d => d.volume).map(d => d.volume!);

        return {
            vo2: vo2Values.length ? [Math.floor(Math.min(...vo2Values) - 1), Math.ceil(Math.max(...vo2Values) + 1)] : [0, 60],
            fitness: fitnessValues.length ? [Math.min(...fitnessValues) - 5, Math.max(...fitnessValues) + 5] : [-30, 30],
            volume: volumeValues.length ? [0, Math.max(...volumeValues) * 1.2] : [0, 100],
        };
    }, [filteredData]);

    if (!data.length) {
        return (
            <div className="glass-card p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Combined Analytics</h3>
                <p className="text-gray-400">No data available</p>
            </div>
        );
    }

    return (
        <div className="glass-card p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h3 className="text-lg font-semibold text-white">Combined Analytics Overview</h3>

                {/* Time Range Filter */}
                <div className="flex bg-[#1f2937] rounded-lg p-1 border border-gray-700">
                    {(['1M', '3M', '6M', '1Y', 'ALL'] as TimeRange[]).map(range => (
                        <button
                            key={range}
                            onClick={() => setTimeRange(range)}
                            className={`px-3 py-1 text-xs font-medium rounded transition-all ${timeRange === range
                                    ? 'bg-[#374151] text-white shadow-sm'
                                    : 'text-gray-400 hover:text-gray-200'
                                }`}
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
                        className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all flex items-center gap-2 ${visibleSeries[key]
                            ? 'bg-white/10 text-white border border-white/20'
                            : 'bg-transparent text-gray-500 border border-gray-700 hover:border-gray-500'
                            }`}
                    >
                        <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: visibleSeries[key] ? SERIES_CONFIG[key].color : '#6b7280' }}
                        />
                        {SERIES_CONFIG[key].name}
                    </button>
                ))}
            </div>

            {/* Chart */}
            <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="date" stroke="#9ca3af" fontSize={11} tickLine={false} />

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

                        {/* Volume Y-Axis (hidden, uses right side) */}
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
                            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                            labelStyle={{ color: '#9ca3af' }}
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

                        {/* VO2max Raw Dots (No Line) */}
                        {visibleSeries.vo2max && (
                            <Line
                                yAxisId="left"
                                type="monotone"
                                dataKey="vo2max"
                                stroke="transparent"
                                strokeWidth={0}
                                dot={{ fill: SERIES_CONFIG.vo2max.color, r: 3, strokeWidth: 0 }}
                                activeDot={{ r: 5, strokeWidth: 0 }}
                                name="VO2max (Raw)"
                                isAnimationActive={false}
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

                        {/* Volume Bar */}
                        {visibleSeries.volume && (
                            <Bar
                                yAxisId="volume"
                                dataKey="volume"
                                fill={SERIES_CONFIG.volume.color}
                                opacity={0.3}
                                name="Volume (km)"
                            />
                        )}

                        {/* Training Time */}
                        {visibleSeries.trainingTime && (
                            <Line
                                yAxisId="volume"
                                type="monotone"
                                dataKey="trainingTimeHours"
                                stroke={SERIES_CONFIG.trainingTime.color}
                                strokeWidth={2}
                                strokeDasharray="5 5"
                                dot={false}
                                name="Training Time (h)"
                            />
                        )}
                    </ComposedChart>
                </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap justify-center gap-4 text-xs text-gray-400">
                <span>🟡 VO2max = Aerobic power</span>
                <span>🟢 CTL = Long-term fitness</span>
                <span>🔴 ATL = Short-term fatigue</span>
                <span>🔵 TSB = Form (CTL - ATL)</span>
            </div>
        </div>
    );
}
