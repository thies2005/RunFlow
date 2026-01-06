'use client';

import { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart, ComposedChart, Bar } from 'recharts';

interface DataPoint {
    date: string;
    vo2max?: number;
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

export default function CombinedAnalyticsChart({ data }: CombinedAnalyticsChartProps) {
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

    // Convert training time to hours for display
    const chartData = useMemo(() => {
        return data.map(d => ({
            ...d,
            trainingTimeHours: d.trainingTime ? Math.round(d.trainingTime / 60 * 10) / 10 : undefined,
        }));
    }, [data]);

    // Calculate domains for each axis
    const domains = useMemo(() => {
        const vo2Values = data.filter(d => d.vo2max).map(d => d.vo2max!);
        const fitnessValues = data.flatMap(d => [d.ctl, d.atl, d.tsb].filter(Boolean) as number[]);
        const volumeValues = data.filter(d => d.volume).map(d => d.volume!);

        return {
            vo2: vo2Values.length ? [Math.min(...vo2Values) - 2, Math.max(...vo2Values) + 2] : [0, 60],
            fitness: fitnessValues.length ? [Math.min(...fitnessValues) - 5, Math.max(...fitnessValues) + 5] : [-30, 30],
            volume: volumeValues.length ? [0, Math.max(...volumeValues) * 1.2] : [0, 100],
        };
    }, [data]);

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
            <h3 className="text-lg font-semibold text-white mb-4">Combined Analytics Overview</h3>

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

                        {/* VO2max Line */}
                        {visibleSeries.vo2max && (
                            <Line
                                yAxisId="left"
                                type="monotone"
                                dataKey="vo2max"
                                stroke={SERIES_CONFIG.vo2max.color}
                                strokeWidth={2}
                                dot={{ fill: SERIES_CONFIG.vo2max.color, r: 3 }}
                                name="VO2max"
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
